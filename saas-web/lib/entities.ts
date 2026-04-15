export type EntityRef = {
  id: string;
  name: string;
};

export type EntityRefWithPhone = EntityRef & {
  phone?: string | null;
};
