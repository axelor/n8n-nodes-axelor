# @axelor/n8n-nodes-axelor

This is an n8n community node package. It lets you use [Axelor](https://axelor.com) (Axelor Open Platform / Axelor Open Suite ERP) in your [n8n](https://n8n.io/) workflows.

It provides:

- **Axelor**: an action node to create, read, search, update and delete records, work with the Document Management System (DMS), and call actions, business services or any Axelor REST endpoint.
- **Axelor Poll Trigger**: starts a workflow when records are created or updated.
- **Axelor Delete Trigger**: starts a workflow when a record is deleted (webhook based).

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

- [Installation](#installation)
- [Credentials](#credentials)
- [Operations](#operations)
- [Triggers](#triggers)
- [Usage](#usage)
- [Example workflows](#example-workflows)
- [Compatibility](#compatibility)
- [Limitations](#limitations)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)
- [Version history](#version-history)
- [License](#license)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### From the nodes panel (verified node)

Once the node is verified by n8n, the instance owner can install it from the editor:

1. Open the nodes panel and search for **Axelor**.
2. Select the node and choose **Install**.

This works on n8n Cloud and self-hosted n8n. The nodes panel installs the latest version verified by n8n.

### From Settings (self-hosted)

On self-hosted n8n, you can also install any published version, for example to get a release that is not verified yet:

1. Go to **Settings > Community Nodes**.
2. Select **Install**.
3. Enter `@axelor/n8n-nodes-axelor` as the npm package name.
4. Accept the risks of installing unverified code and select **Install**.

### Manual installation (queue mode)

Use manual installation if your n8n instance runs in queue mode, or if installing from the UI is disabled:

1. Go to your n8n custom nodes folder (by default `~/.n8n/nodes`; in Docker, `/home/node/.n8n/nodes` inside the container).
2. Run the install command:

   ```bash
   npm i @axelor/n8n-nodes-axelor
   ```

3. Restart n8n. In queue mode, install the package on the main instance and on every worker.

## Credentials

The nodes use the **Axelor API** credential, which authenticates with HTTP Basic Auth.

| Field    | Description                                                                 |
| -------- | --------------------------------------------------------------------------- |
| Base URL | URL of your Axelor instance, including its context path if it has one, for example `https://erp.example.com` or `https://example.com/axelor-erp`. Do not add `/ws` or a trailing `/`. |
| Username | An Axelor user login                                                        |
| Password | That user's password                                                        |

Prerequisites on the Axelor side:

1. The Axelor instance must be reachable from your n8n instance. If n8n runs in Docker, `localhost` points to the n8n container, not to your machine.
2. The user must have the permissions needed for the models and operations you use. The node acts with that user's rights.

When you save the credential, n8n tests it by logging in to Axelor (`POST /callback`).

## Operations

### Record

| Operation            | Description                                                         |
| -------------------- | ------------------------------------------------------------------- |
| Create Custom Record | Create a record in a custom (Studio / JSON) model                   |
| Create Record        | Create a record in a model. Fields are mapped from the model's metadata. |
| Delete Record        | Delete a record                                                     |
| Find Records         | Return the most recently updated records (up to **Limit**), or one record when **Find By ID** is on |
| Read Records         | Read one selected record, with the fields you choose                |
| Search Records       | Search records using filter criteria                                |
| Update Custom Record | Update a record of a custom model                                   |
| Update Record        | Update an existing record                                           |

### DMS File

Files in the Axelor Document Management System (DMS).

| Operation        | Description                                                              |
| ---------------- | ------------------------------------------------------------------------ |
| Add Attachment   | Attach uploaded files to a record, using the file IDs returned by **Upload File** |
| Download File    | Download a DMS file by its ID, as binary data                            |
| List Attachments | List the attachments of a record                                         |
| List Files       | List DMS files, optionally in a parent folder or matching a name pattern |
| Upload File      | Upload binary data from a previous node to Axelor and return the file ID |

To attach a new file to a record, use **Upload File**, then **Add Attachment** with the returned ID.

### Generic

| Operation                  | Description                                                    |
| -------------------------- | -------------------------------------------------------------- |
| Run Action                 | Execute an Axelor action (for example `action-xxx`) with a context |
| Make Business Service Call | Call a business service exposed by Axelor's connect web services (`/ws/connect`). Pick the module and action, then set the parameters. |
| Make API Call              | Call any Axelor REST endpoint with a path relative to the Base URL, for example `/ws/rest/com.axelor.apps.base.db.Partner/1`. Authentication is added for you. Full URLs are rejected, so your credentials are only sent to your Axelor instance. |

The Axelor action node can also be used as a tool by AI Agent nodes. On self-hosted n8n, this requires the environment variable `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true`.

## Triggers

### Axelor Poll Trigger

Polls a model at the interval you set and outputs records that are new (**Create**) or new or changed (**Update**), based on their `createdOn` / `updatedOn` dates. In the nodes panel it appears as its own entry, **Axelor Poll**.

- **Poll Times**: how often to check for records (required).
- **Choose Where To Start**: `All` returns every existing record on the first poll; `Since Specific Date` starts from the date you pick.
- **Limit**: the maximum number of records fetched per poll.

### Axelor Delete Trigger

Starts a workflow when a record of the selected model is deleted.

When you activate the workflow, the node registers its webhook URL in Axelor (model `com.axelor.connect.db.Webhook`) and removes it when the workflow is deactivated. This requires:

- the Axelor module that provides the connect web services and the `com.axelor.connect.db.Webhook` model (also used by **Make Business Service Call**) to be installed, and
- your Axelor instance to be able to reach n8n's webhook URL.

## Usage

1. Create an **Axelor API** credential (see [Credentials](#credentials)).
2. Add the **Axelor** node to a workflow and pick a **Resource** (Record, DMS File or Generic) and an **Operation**.
3. Choose the **Model** from the list (it is loaded from your instance), or set its fully qualified name with an expression, for example `com.axelor.apps.sale.db.SaleOrder`.
4. Map fields, set filters, and run the node.

Tips:

- Turn on **Settings > On Error > Continue** to keep processing remaining items when one fails. The error message is returned in the item's `error` field.
- For DMS uploads, pass the file as binary data from a previous node (for example *Read/Write Files from Disk* or *HTTP Request*).

## Example workflows

Example workflows are available in the [`examples`](https://github.com/axelor/n8n-nodes-axelor/tree/main/examples) folder of the repository:

| Workflow | What it does | Requires in Axelor | Other services |
| -------- | ------------ | ------------------ | -------------- |
| [`overDuePaymentReminder.json`](https://github.com/axelor/n8n-nodes-axelor/blob/main/examples/overDuePaymentReminder.json) | On a schedule, searches sale orders with overdue payments and emails a reminder | Sales app (`com.axelor.apps.sale.db.SaleOrder`) | Gmail |
| [`saleOrder.json`](https://github.com/axelor/n8n-nodes-axelor/blob/main/examples/saleOrder.json) | On a schedule, searches the day's sale orders and emails a daily sales summary | Sales app (`com.axelor.apps.sale.db.SaleOrder`) | Gmail |
| [`AxelorportalNews.json`](https://github.com/axelor/n8n-nodes-axelor/blob/main/examples/AxelorportalNews.json) | Collects news with Apify, processes it with an AI agent, and creates news posts in the Axelor portal | Portal app (`com.axelor.apps.portal.db.PortalNews`, `PortalNewsCategory`) | Apify, Google Gemini, Google Sheets |

To use one:

1. Install this package first, so n8n recognizes the Axelor nodes.
2. Download the JSON file and import it in n8n (**Workflows > Import from File**).
3. In each Axelor node, select your **Axelor API** credential. The Axelor instance must be reachable from n8n and have the app listed above.
4. Select your credentials for the other services, and replace the placeholders (`user@example.com`, `https://your-axelor-instance.com`, `YOUR_GOOGLE_SHEET_ID`, `YOUR_APIFY_API_TOKEN_HERE`) with your values.

The model and field lists in the Axelor nodes are loaded from your Axelor instance. Until a working credential is selected, they show **Error fetching options from Axelor**. The model saved in the example is kept and appears once the list loads.

## Compatibility

- **n8n**: recent 1.x and 2.x releases (the package is built against `n8n-workflow` 2.x).
- **Axelor**: Axelor Open Platform 7.x and later.

## Limitations

- OneToMany fields are not supported when creating or updating records.

## Troubleshooting

- **Authentication errors**: check the Base URL, username and password, and that the user can log in to Axelor.
- **Model not found**: model names are case-sensitive and must be fully qualified (for example `com.axelor.apps.base.db.Partner`).
- **Missing fields when mapping**: make sure the user can see the model's fields, and fill all required fields.
- **Delete Trigger never fires**: check that the webhook record exists in Axelor and that Axelor can reach the n8n webhook URL.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Axelor documentation](https://docs.axelor.com)
- [Axelor REST web services](https://docs.axelor.com/adk/latest/dev-guide/web-services/index.html)
- [Issue tracker](https://github.com/axelor/n8n-nodes-axelor/issues)

## Version history

See [CHANGELOG.md](https://github.com/axelor/n8n-nodes-axelor/blob/main/CHANGELOG.md).

## License

[MIT](LICENSE.md)
