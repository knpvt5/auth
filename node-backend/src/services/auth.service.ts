import ApiResponse from "../dtos/apiResponse.js";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
// import userData from "../../../userDB.json" with { type: "json" };
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const userData = require("../../../userDB.json");

// Path to the userDB.json file
// Assumes the process runs from node-backend folder
const DB_PATH = path.resolve(process.cwd(), "../userDB.json");

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  createdAt?: string;
  updatedAt?: string;
}

const typedUserData: User[] = userData;

export class UserService {
  
  private static async writeDB(users: User[]): Promise<void> {
    try {
      await fs.writeFile(DB_PATH, JSON.stringify(users, null, 2), "utf-8");
    } catch (error) {
      console.error("Error writing to DB:", error);
      throw error;
    }
  }

  static async findByEmail(email: string): Promise<ApiResponse> {
    if (!email) {
      return new ApiResponse(400, false, "Email is required", null);
    }

    const users = typedUserData;
    const user = users.find((u) => u.email === email);
    
    if (!user) {
      return new ApiResponse(404, false, "User not found", null);
    }
    return new ApiResponse(200, true, "User Already Exists", { _id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName });
  }

  static async register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<ApiResponse> {
    try {
        const users = typedUserData;
        
        if (users.some((u) => u.email === userData.email)) {
            return new ApiResponse(409, false, "Email already registered", null);
        }

        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        const newUser: User = {
            _id: crypto.randomUUID(),
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        users.push(newUser);
        await this.writeDB(users);

        // Don't return password
        const { password, ...userResponse } = newUser;
        return new ApiResponse(201, true, "User registered successfully", userResponse);
    } catch (error: any) {
      console.error("Error registering user:", error);
      return new ApiResponse(500, false, "Failed to register user", {
        message: error?.message ?? "Unknown error",
      });
    }
  }

  static async login(email: string, password: string): Promise<ApiResponse> {
    if (!email) {
      return new ApiResponse(400, false, "Email is required", null);
    }

    if (!password) {
      return new ApiResponse(400, false, "Password is required", null);
    }

    const users = typedUserData;
    const user = users.find((u) => u.email === email);

    if (!user) {
      return new ApiResponse(404, false, "User not found", null);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return new ApiResponse(401, false, "Invalid credentials", null);
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is not defined");
    }

    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" },
    );

    const { password: _, ...userWithoutPassword } = user;

    return new ApiResponse(200, true, "Login successful", {
      user: userWithoutPassword,
      accessToken,
    });
  }

  static async getUserData(accessToken: string): Promise<ApiResponse> {
    if (!accessToken) {
      return new ApiResponse(401, false, "Access token is required", null);
    }

    try {
      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET environment variable is not defined");
      }
      const decodedToken = jwt.verify(accessToken, JWT_SECRET) as JwtPayload;
      const userId = decodedToken.userId;

      const users = typedUserData;
      const user = users.find((u) => u._id === userId);

      if (!user) {
        return new ApiResponse(404, false, "User not found", null);
      }

      const { password, ...userData } = user;

      return new ApiResponse(
        200,
        true,
        "User data retrieved successfully",
        userData,
      );
    } catch (error: any) {
      console.error("Error verifying token:", error);

      if (error?.name === "TokenExpiredError") {
        return new ApiResponse(401, false, "Token expired", null);
      }

      if (error?.name === "JsonWebTokenError") {
        return new ApiResponse(401, false, "Invalid token", null);
      }

      return new ApiResponse(500, false, "Failed to verify token", {
        message: error?.message ?? "Unknown error",
      });
    }
  }

  static async resetPassword(
    email: string,
    newPassword: string,
  ): Promise<ApiResponse> {
    if (!email) {
      return new ApiResponse(400, false, "Email is required", null);
    }

    if (!newPassword) {
      return new ApiResponse(400, false, "New password is required", null);
    }

    try {
      const users = typedUserData;
      const userIndex = users.findIndex((u) => u.email === email);
      
      if (userIndex === -1) {
        return new ApiResponse(404, false, "User not found", null);
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      users[userIndex].password = hashedPassword;
      users[userIndex].updatedAt = new Date().toISOString();

      await this.writeDB(users);

      return new ApiResponse(200, true, "Password reset successfully", null);
    } catch (error: any) {
      console.error("❌ Error in resetPassword:", error);
      return new ApiResponse(500, false, "Failed to reset password", {
        message: error?.message ?? "Unknown error",
      });
    }
  }
}
