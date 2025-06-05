# Axelor n8n Integration

Connect your [Axelor ERP](https://docs.axelor.com) applications with [n8n](https://n8n.io/) workflows, enabling powerful automation capabilities.

## 📚 Overview

The **n8n-nodes-axelor** integration allows you to connect your Axelor ERP applications with n8n workflows. This integration provides comprehensive access to Axelor's data and functionality through three main resource categories:

- **Record**: Core CRUD operations for Axelor models
- **DMS**: Document Management System operations
- **Generic**: Custom actions and operations

## 🔑 Authentication

Before using any Axelor node, you need to set up authentication:

1. **Create Axelor API credentials** in n8n:

   - **Base URL**: Your Axelor instance URL (e.g., `https://your-axelor-instance.com`)
   - **Authentication**: Basic Auth (username & password)
   - **Username**: Your Axelor username
   - **Password**: Your Axelor password

2. **Enable API Access** in your Axelor instance:
   - Ensure Basic Auth is properly configured in your Axelor instance
   - Verify the user has appropriate permissions for the operations you plan to perform

## 📦 Installation

1. **Navigate to your n8n root folder**
2. Run the install command:

   ```bash
   npm install n8n-nodes-axelor
   ```

3. **Restart n8n**
4. Find the new **Axelor** nodes in the node selector.

## 🔄 Available Operations

### Record Operations

- **Create Record**: Creates a new record in the specified Axelor model
- **Create Custom Record**: Creates a new record in a custom model
- **Find Records**: Retrieves records by ID from the specified model
- **Read Records**: Fetches one or multiple records with related fields
- **Search Records**: Uses search queries to filter and find records
- **Update Record**: Updates an existing record with new values
- **Update Custom Record**: Updates an existing record in a custom model
- **Delete Record**: Removes a record from the system

### DMS Operations

- **List Files**: Lists all files in the Axelor Document Management System
- **List Attachments**: Lists all attachments associated with a specific record
- **Download File**: Downloads a file from the DMS using its ID
- **Add Attachment**: Attaches an existing file to a record
- **Upload File**: Uploads a new file to the Axelor DMS

### Generic Operations

- **Run Action**: Executes a predefined action using custom parameters
  **Business Service Call**: Calls a specific business service in Axelor
- **Make API Call**: Makes a custom API call to the Axelor REST API

### Triggers

- **Axelor Delete Trigger**: Starts a workflow when records are deleted in Axelor
- **Axelor Poll Trigger**: Triggers when a new item is created or updated

## ⚙️ Compatibility

- **n8n**: v0.230.0+
- **Axelor Platform**: v7.x+

## Limitations

- **No Support for OneToMany Fields (v0.1.0)**: The integration currently does not support OneToMany relationships
- **No Related Field Support**: Fields that reference related entities cannot be properly handled in the current version

## 🛠️ Best Practices

- **Error Handling**: Use "Continue on Fail" and error handling nodes for robust workflows
- **Batching**: Process records in batches for better performance
- **Credentials**: Store credentials securely and rotate regularly
- **Testing**: Test workflows with small data sets before production use
- **Logging**: Add logging nodes to track execution for troubleshooting
- **Advanced Settings**: Use advanced settings for better control over data retrieval and processing

## 🔍 Troubleshooting

### Common Issues

- **Authentication Errors**: Verify credentials are correct and check user permissions in Axelor
- **Model Not Found**: Ensure model name is correct (case-sensitive) and verify the model exists in your Axelor instance
- **Field Mapping Issues**: Check field names and types, and ensure required fields are provided
- **File Operations Failing**: Verify file exists, check file size limits, and ensure proper MIME types

### Getting Help

- Check the [n8n community forum](https://community.n8n.io/)
- Review [Axelor API documentation](https://docs.axelor.com/adk/latest/dev-guide/web-services/index.html)
- Examine workflow execution logs for detailed error messages

## 📚 Additional Resources

- [n8n Documentation](https://docs.n8n.io/)
- [Axelor Documentation](https://docs.axelor.com)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)

## 📝 Version History

| Version | Date       | Highlights                                                                     |
| ------- | ---------- | ------------------------------------------------------------------------------ |
| 0.1.0   | 2025-06-01 | Initial release: CRUD operations + DMS + Generic opeations + Delete Trigger 🚀 |

---

Happy automating! 🎉
