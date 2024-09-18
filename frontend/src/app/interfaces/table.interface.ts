export interface Table {
    _id: string;  // Make _id required
    number: string;
    capacity: number;
    isOccupied: boolean;
    otp: string;
    otpGeneratedAt: Date;
    lastOrderTime?: Date;  // Include lastOrderTime as optional
  }