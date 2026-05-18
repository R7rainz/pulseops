import type { FastifyReply, FastifyRequest } from "fastify";
import { signupSchema } from "./auth.schema";
import { signupService } from "./auth.service";

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
