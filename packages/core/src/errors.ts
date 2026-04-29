export class TicketBAIError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
  }
}

export class TbaiError extends Error {
  code: string = "";
}
