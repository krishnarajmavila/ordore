
export interface Table {
    _id?: string;
    number: string;
    capacity: number;
    isOccupied: boolean;
    otp: string;
    otpGeneratedAt: Date;
  }
  
  export interface MenuItem {
    _id?: string;
    name: string;
    category: string;
    price: number;
    description?: string;
    imageUrl?: string;
    isVegetarian: boolean;
  }