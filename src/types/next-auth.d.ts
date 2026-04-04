import "next-auth";

declare module "next-auth" {
  interface User {
    role?: "admin" | "provider";
    providerId?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "admin" | "provider";
      providerId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin" | "provider";
    providerId?: string;
  }
}
