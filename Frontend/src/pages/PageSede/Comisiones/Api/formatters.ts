// src/utils/formatters.ts
export const formatMoneda = (monto: number, moneda: string = 'USD'): string => {
  const currencyConfig: Record<string, any> = {
    'USD': { 
      currency: 'USD', 
      style: 'currency', 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    },
    'COP': { 
      currency: 'COP', 
      style: 'currency', 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    },
    'EUR': { 
      currency: 'EUR', 
      style: 'currency', 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    },
  };

  const config = currencyConfig[moneda] || currencyConfig.USD;
  
  try {
    return new Intl.NumberFormat('es-ES', config).format(monto);
  } catch (error) {
    return `${config.currency} ${monto.toFixed(2)}`;
  }
};