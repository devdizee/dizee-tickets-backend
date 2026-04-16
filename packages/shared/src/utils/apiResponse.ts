export class apiResponse {
  public status: number;
  public message: string;
  public data: unknown;
  public error: unknown;
  public success: boolean;

  constructor(status: number, message: string, data: unknown = {}, error: unknown = {}) {
    this.status = status;
    this.message = message;
    this.data = data;
    this.error = error;
    this.success = status >= 200 && status < 300;
  }
}
