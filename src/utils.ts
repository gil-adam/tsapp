const { DefaultAzureCredential } = require("@azure/identity");
const { TableClient } = require("@azure/data-tables");

const initTableClient = (tableName: string) => {
  const tokenCredential = new DefaultAzureCredential();
  const tableClient = new TableClient(
    `https://tsappstorage189.table.core.windows.net`,
    tableName,
    tokenCredential
  );
  return tableClient;
};

enum TableNames {
  users = "users",
  appointments = "appointments",
}

export { initTableClient, TableNames };
