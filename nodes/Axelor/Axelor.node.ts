import {
  INodeType,
  INodeTypeDescription,
  INodePropertyOptions,
  ILoadOptionsFunctions,
  IExecuteFunctions,
  IDataObject,
  INodeExecutionData,
  NodeConnectionType,
  ResourceMapperField,
  ResourceMapperFields,
  LoggerProxy as Logger,
} from 'n8n-workflow';

export class Axelor implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Axelor',
    name: 'axelor',
    icon: 'file:Axelor.svg',
    group: ['input'],
    version: 1,
    defaults: { name: 'Axelor', color: '#336699' },
    description: 'Integrate with Axelor Open Platform',
    inputs: [NodeConnectionType.Main],
    outputs: [NodeConnectionType.Main],
    credentials: [{ name: 'axelorApi', required: true }],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          { name: 'Create Record', value: 'create' },
          { name: 'Get Updated Records', value: 'getUpdated' },
        ],
        default: 'create',
      },
      {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        typeOptions: { loadOptionsMethod: 'getModels' },
        placeholder: 'Select Axelor model',
        required: true,
        default: '',
      },
      {
        displayName: 'Fields',
        name: 'fields',
        type: 'resourceMapper',
        required: true,
        default: { mappingMode: 'defineBelow', value: null },
        typeOptions: {
          resourceMapper: {
            resourceMapperMethod: 'getFields',
            mode: 'add',
            fieldWords: { singular: 'field', plural: 'fields' },
          },
        },
        displayOptions: { show: { operation: ['create'] } },
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        default: 100,
        description: 'Maximum number of records to fetch',
        displayOptions: { show: { operation: ['getUpdated'] } },
      },
    ],
  };

  methods = {
    loadOptions: {
      async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        Logger.debug('Axelor:getModels - fetching models');
        const creds = await this.getCredentials('axelorApi');
        const response = await this.helpers.request!({
          method: 'GET',
          url: '/ws/meta/models',
          baseURL: creds.baseUrl as string,
          auth: { user: creds.username as string, pass: creds.password as string },
          json: true,
        });
        const names: string[] = Array.isArray(response.data) ? response.data : [];
        return names.map((n) => ({ name: n, value: n }));
      },
    },
    resourceMapping: {
      async getFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
        Logger.debug('Axelor:getFields - fetching fields');
        const creds = await this.getCredentials('axelorApi');
        const model = this.getCurrentNodeParameter('model') as string;
        if (!model) return { fields: [] };
        const resp = await this.helpers.request!({
          method: 'GET',
          url: `/ws/meta/fields/${encodeURIComponent(model)}`,
          baseURL: creds.baseUrl as string,
          auth: { user: creds.username as string, pass: creds.password as string },
          json: true,
        });
        const infos: Array<{ name: string }> = resp.data?.fields || [];
        const options: ResourceMapperField[] = infos.map((f) => ({
          id: f.name,
          displayName: f.name,
          defaultMatch: false,
          required: false,
          display: true,
        }));
        return { fields: options };
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    Logger.info('Axelor:execute - start');
    const items = this.getInputData();
    const returnData: IDataObject[] = [];
    const creds = await this.getCredentials('axelorApi');
    const baseUrl = creds.baseUrl as string;
    const op = this.getNodeParameter('operation', 0) as string;
    const staticData = this.getWorkflowStaticData('node');

    for (let i = 0; i < items.length; i++) {
      const model = this.getNodeParameter('model', i) as string;

      if (op === 'create') {
        const mapping = this.getNodeParameter('fields', i, {}) as any;
        const data: IDataObject = {};
        Object.entries(mapping.value || {}).forEach(([k, v]) => {
          if (v !== undefined) data[k] = v;
        });
        const res = await this.helpers.request!({
          method: 'POST',
          url: `/ws/rest/${encodeURIComponent(model)}`,
          baseURL: baseUrl,
          auth: { user: creds.username as string, pass: creds.password as string },
          body: { data },
          json: true,
        });
        returnData.push(res.data?.[0] || res.data);
      }

      if (op === 'getUpdated') {
        const limit = this.getNodeParameter('limit', i) as number;
        const lastTs = staticData.lastTimestamp as string | undefined;

        // Fetch all field IDs once (inline instead of methods)
        const respFields = await this.helpers.request!({
          method: 'GET',
          url: `/ws/meta/fields/${encodeURIComponent(model)}`,
          baseURL: baseUrl,
          auth: { user: creds.username as string, pass: creds.password as string },
          json: true,
        });
        const infos: Array<{ name: string }> = respFields.data?.fields || [];
        const fieldNames: string[] = infos.map((f) => f.name);

        // Single search call with full fields
        const body: any = { offset: 0, limit, fields: fieldNames, sortBy: [], data: {} };
        if (lastTs) {
          body.data = {
            criteria: [
              {
                operator: 'or',
                criteria: [
                  { fieldName: 'updatedOn', operator: 'gt', value: lastTs },
                  { fieldName: 'createdOn', operator: 'gt', value: lastTs },
                ],
              },
            ],
          };
        } else {
          body.sortBy.push('-updatedOn');
        }

        const resp = await this.helpers.request!({
          method: 'POST',
          url: `/ws/rest/${encodeURIComponent(model)}/search`,
          baseURL: baseUrl,
          auth: { user: creds.username as string, pass: creds.password as string },
          body,
          json: true,
        });
        const records: IDataObject[] = resp.data || [];
        returnData.push(...records);

        // Update last timestamp
        let maxTs = lastTs;
        for (const r of records) {
          const updated = r.updatedOn as string;
          const created = r.createdOn as string;
          const ts = updated > created ? updated : created;
          if (!maxTs || ts > maxTs) maxTs = ts;
        }
        if (maxTs) staticData.lastTimestamp = maxTs;
      }
    }

    Logger.info('Axelor:execute - done');
    return [this.helpers.returnJsonArray(returnData)];
  }
}
