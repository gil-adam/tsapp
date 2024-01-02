import express, { Application, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import morgan from "morgan";
require("dotenv").config();

import { initTableClient, TableNames } from "../utils";
const { odata } = require("@azure/data-tables");

const app: Application = express();
app.use(morgan("combined"));
const tableClient = initTableClient(TableNames.appointments);

// Routes
app.get("/", async (req: Request, res: Response): Promise<Response> => {
  return res.status(200).send({
    message: "Hello World!",
  });
});

app.get(
  "/appointment/:user",
  async (req: Request, res: Response): Promise<Response> => {
    const listAppointments = tableClient.listEntities({
      queryOptions: { filter: odata`PartitionKey eq ${req.params.user}` },
    });
    const appointments = [];
    for await (const apt of listAppointments) {
      appointments.push({
        id: apt.rowKey,
        startDate: apt.startDate,
        endDate: apt.endDate,
        location: apt.location,
      });
    }
    return res.status(200).json(appointments);
  }
);

app.post(
  "/appointment/:user",
  async (req: Request, res: Response): Promise<Response> => {
    console.log(req.query);
    if (
      typeof req.query.startDate !== "string" ||
      typeof req.query.endDate !== "string"
    ) {
      return res.status(400).send({
        message: "Invalid date format",
      });
    }
    const apt: Appointment = {
      partitionKey: req.params.user,
      rowKey: uuidv4(),
      startDate: new Date(Date.parse(req.query.startDate)),
      endDate: new Date(Date.parse(req.query.endDate)),
      location: "foo",
    };
    try {
      await tableClient.createEntity(apt);
    } catch (error: any) {
      return res.status(400).send({
        message: "Could not create appointment",
      });
    }
    return res
      .status(200)
      .json({ id: apt.rowKey, startDate: apt.startDate, endDate: apt.endDate });
  }
);

app.delete(
  "/appointment/:user/:aptId",
  async (req: Request, res: Response): Promise<Response> => {
    try {
      await tableClient.deleteEntity(req.params.user, req.params.aptId);
    } catch (error: any) {
      return res.status(400).send({
        message: "No appointment found",
      });
    }
    return res.status(200).send({
      message: "Appointment deleted",
    });
  }
);

try {
  app.listen(process.env.APPOINTMENT_PORT, (): void => {
    console.log(
      `Appointment service running on port ${process.env.APPOINTMENT_PORT}`
    );
  });
} catch (error: any) {
  console.error(`Error occured: ${error.message}`);
}

interface Appointment {
  partitionKey: string; // user ID
  rowKey: string; // appointment ID
  startDate: Date;
  endDate: Date;
  location: string;
}
