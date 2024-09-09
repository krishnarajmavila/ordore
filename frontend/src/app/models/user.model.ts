export interface User {
    username: string;
    password: string;
    userType: 'customer' | 'cook' | 'billing' | 'admin';
  }