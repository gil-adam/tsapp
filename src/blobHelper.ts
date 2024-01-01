import exp from "constants";

async function streamToBuffer(readableStream: any) {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    readableStream.on("data", (data: any) => {
      const content: Buffer = data instanceof Buffer ? data : Buffer.from(data);
      chunks.push(content);
    });
    readableStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on("error", reject);
  });
}

export default async function downloadBlobToString(
  containerClient: any,
  blobName: any
): Promise<string> {
  const blobClient = await containerClient.getBlobClient(blobName);

  const downloadResponse = await blobClient.download();

  if (!downloadResponse.errorCode && downloadResponse.readableStreamBody) {
    const downloaded = await streamToBuffer(
      downloadResponse.readableStreamBody
    );
    if (downloaded) {
      console.log("Downloaded blob content:", downloaded.toString());
      return downloaded.toString();
    }
  }
  return "";
}

// const blobServiceClient = new BlobServiceClient(
//   `https://${process.env.STORAGE_ACCOUNT}.blob.core.windows.net`,
//   tokenCredential
// );

// app.get("/blob", async (req: Request, res: Response): Promise<Response> => {
//   const containerName = "appdata";
//   const blobName = "foo.json";
//   const containerClient = await blobServiceClient.getContainerClient(
//     containerName
//   );
//   const blobClient = await containerClient.getBlockBlobClient(blobName);
//   const content = await downloadBlobToString(containerClient, blobName);
//   return res.status(200).json(JSON.parse(content));
// });
