import { ValueTransformer } from 'typeorm';

export const JsonTransformer: ValueTransformer = {
  to: (value: any): string => {
    if (value === null || value === undefined) {
      return value;
    }
    return JSON.stringify(value);
  },
  from: (value: string): any => {
    if (value === null || value === undefined) {
      return value;
    }
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },
}; 