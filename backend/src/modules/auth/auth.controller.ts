import type { FastifyReply, FastifyRequest } from "fastify";
import { loginSchema, signupSchema } from "./auth.schema";
import { loginService, signupService, refreshTokenService } from "./auth.service";
import { getMeService } from "./auth.service";

export async function signupController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    //validate request body
    const body = signupSchema.parse(request.body);
    //call signupService
    const user = await signupService(body);
    // return 201 response
    return response
      .status(201)
      .send({ message: "User created successfully", data: user });
  } catch (error) {
    //return error response
    return response.status(400).send({
      message: error instanceof Error ? error.message : "Signup Failed",
    });
  }
}

export async function loginController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const body = loginSchema.parse(request.body);
    const user = await loginService(body);
    return response
      .status(200)
      .send({ message: "Login successful", data: user });
  } catch (error) {
    return response.status(400).send({
      message: error instanceof Error ? error.message : "Login Failed",
    });
  }
}

export async function refreshTokenController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return response.status(401).send({ message: "Token missing" });
    }

    const token = authHeader.split(" ")[1];
    const result = await refreshTokenService(token);

    return response.status(200).send({
      message: "Token refreshed successfully",
      data: result,
    });
  } catch (error) {
    return response.status(401).send({
      message: error instanceof Error ? error.message : "Token refresh failed",
    });
  }
}

export async function meController(
  request: FastifyRequest,
  response: FastifyReply,
) {
  try {
    const user = await getMeService(request.user.userId);

    return response
      .status(200)
      .send({ message: "Current user fetched successfully", data: user });
  } catch (error) {
    return response.status(401).send({ message: "Invalid or expired token" });
  }
}
