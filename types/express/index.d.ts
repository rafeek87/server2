interface User {
  id: string;
  type: string;
}

declare namespace Express {
  interface Request {
    user: User;
  }
}
