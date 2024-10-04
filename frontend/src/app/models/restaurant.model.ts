export interface Restaurant {
    _id: string;
    name: string;
    parentOrganization: string;
    type: 'branch' | 'franchisee';
    city: string;
    createdAt: Date;
    updatedAt: Date;
  }