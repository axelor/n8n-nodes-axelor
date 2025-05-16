## 🚀 Introduction

Welcome to the **n8n-nodes-axelor** community node! This integration allows you to seamlessly connect your [Axelor ERP](https://docs.axelor.com) applications with your [n8n](https://n8n.io/) workflows, enabling powerful automation.

## 📦 Installation

1. **Navigate to your n8n root folder**
2. Run the install command:

   ```bash
   npm install n8n-nodes-axelor
   ```
3. **Restart n8n**
4. Find the new **Axelor** nodes in the node selector.

> Tip: Follow the official [n8n community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) for more details.

## 🔧 Operations

The Axelor node supports full CRUD and a delete trigger:

### 🆕 Create Record

* **Model**: e.g., `com.axelor.apps.sale.db.SaleOrder`
* **Fields**: Specify fields to set for the new record.

### 🔍 Find / Read / Search Records

* **Find**: Retrieve by ID.
* **Read**: Fetch one or multiple records with related fields.
* **Search**: Use search queries to filter records.

### ✏️ Update Record

* **ID**: Record to update.
* **Fields**: Specify fields and new values.

### 🗑 Delete Record

* **Model & ID**: Remove the specified record.

### 🚨 Delete Trigger

* **On Record Deletion**: Start workflows when records are deleted.

## 🔐 Credentials

1. **Axelor Instance**: Cloud or self-hosted
2. **Enable Access**: Configure Basic Auth in Axelor

In n8n, create **Axelor API** credentials:

* **Base URL**: `https://your-axelor-instance.com`
* **Authentication**: Basic Auth (username & password)

Save credentials before using Axelor nodes.

## ⚙️ Compatibility

* **n8n**: v0.230.0+
* **Axelor Platform**: v7.x+

## 🚀 Usage Guide

1. **Add Credentials**: Test your Axelor API credentials.
2. **Create Operation**:

   * Drag **Axelor** node, select `Create Record`.
   * Choose Module and map fields.
3. **Find / Read / Search**:

   * Set appropriate operation and filters.
4. **Update**:

   * Choose `Update Record`, provide ID and fields.
5. **Delete**:

   * Use `Delete Record`, specify model & ID.
6. **Delete Trigger**:

   * Add **Axelor Delete Trigger**, select model, chain follow-up nodes.

> 💡 *Schema Viewer*: Inspect module fields and types at design time.

## 📚 Resources

* [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/) 📝
* [Axelor Official Docs](https://docs.axelor.com) 📖
* [Axelor REST API Reference](https://docs.axelor.com/adk/7.4/dev-guide/web-services/index.html) 🌐

## 📝 Version History

| Version | Date       | Highlights                                           |
| ------- | ---------- | ---------------------------------------------------- |
| 1.0.0   | 2025-05-16 | Initial release: CRUD operations + Delete Trigger 🚀 |

---

Happy automating! 🎉
