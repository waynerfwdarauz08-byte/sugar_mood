import {api} from './api';
export const reporteService = {
  ventas: (filters) => api.list('reportes/ventas',filters),
};
