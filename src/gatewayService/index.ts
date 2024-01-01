import express, { Application, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import passport from "passport";
import sha256 from "sha256";
import jwt from "jsonwebtoken";
import { applyPassportStrategy } from "./auth";
import { initTableClient, TableNames } from "../utils";

require("dotenv").config();

const app: Application = express();
app.use(express.json());
app.use(express.urlencoded());
applyPassportStrategy(passport);

// Azure storage clients
const usersTableClient = initTableClient(TableNames.users);

// Appointment service client
const aptService = axios.create({
  baseURL: process.env.APPOINTMENT_SERVICE_URL,
  timeout: 10000,
  headers: { "X-Custom-Header": "foobar" },
});

// Routes
app.get("/", async (req: Request, res: Response): Promise<Response> => {
  const response = await aptService.get("/");
  return res.status(200).json({
    message: "Hello Gateway!",
    response: response.data,
  });
});

app.post("/signup", async (req: Request, res: Response): Promise<Response> => {
  try {
    const password = req.query.password as string;
    if (!password) {
      return res.status(400).send({
        message: "Password is required",
      });
    }
    await usersTableClient.createEntity({
      rowKey: req.query.user,
      partitionKey: "1",
      password: sha256(password),
    });
  } catch (error: any) {
    console.log(error.message);
    return res.status(400).send({
      message: "Failed to create user",
    });
  }
  return res.status(200).send({ message: "User created" });
});

app.get("/login", async (req: Request, res: Response): Promise<Response> => {
  if (!req.query.user || !req.query.password) {
    return res.status(400).send({
      message: "missing user or password",
    });
  }
  try {
    const user = await usersTableClient.getEntity(
      "1",
      req.query.user as string
    );
    if (user.password === sha256(req.query.password as string)) {
      const token = jwt.sign({ user: req.query.user }, "foo", {
        expiresIn: 1000000,
      });
      return res.status(200).send({
        message: "Login successful",
        token: token,
      });
    }
    return res.status(400).send({
      message: "wrong password",
    });
  } catch (err: any) {
    return res.status(400).send({
      message: "User not found",
    });
  }
});

app.get(
  "/appointment/:user",
  passport.authenticate("jwt", { session: false }),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const response = await aptService.get("/appointment/" + req.params.user);
      return res.status(200).json(response.data);
    } catch {
      return res.status(400).send({
        message: "Failed to get appointments from appointment service",
      });
    }
  }
);

app.post(
  "/appointment/:user",
  passport.authenticate("jwt", { session: false }),
  async (req: Request, res: Response): Promise<Response> => {
    if (
      typeof req.query.startDate !== "string" ||
      typeof req.query.endDate !== "string"
    ) {
      return res.status(400).send({
        message: "Invalid date format",
      });
    }
    try {
      const response = await aptService.post(
        "/appointment/" + req.params.user,
        { params: req.query }
      );
      return res.status(200).json(response.data);
    } catch {
      return res.status(400).send({
        message: "Failed to create appointment in appointment service",
      });
    }
  }
);

app.delete(
  "/appointment/:user/:aptId",
  passport.authenticate("jwt", { session: false }),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const response = await aptService.delete(
        "/appointment/" + req.params.user + "/" + req.params.aptId
      );
      return res.status(200).json(response.data);
    } catch {
      return res.status(400).send({
        message: "Failed to delete appointment in appointment service",
      });
    }
  }
);

try {
  app.listen(process.env.GATEWAY_PORT, (): void => {
    console.log(`Gateway service running on port ${process.env.GATEWAY_PORT}`);
  });
} catch (error: any) {
  console.error(`Error occured: ${error.message}`);
}
