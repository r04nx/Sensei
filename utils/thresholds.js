require('dotenv').config();

const THRESHOLDS = {
  VOLTAGE: {
    LOW_AC_WARNING: Number(process.env.THRESHOLD_VOLTAGE_LOW_AC_WARNING),
    HIGH_AC_WARNING: Number(process.env.THRESHOLD_VOLTAGE_HIGH_AC_WARNING),
    HIGH_DC_WARNING: Number(process.env.THRESHOLD_VOLTAGE_HIGH_DC_WARNING),
    LOW_DC_ERROR: Number(process.env.THRESHOLD_VOLTAGE_LOW_DC_ERROR),
    HIGH_AC_ERROR: Number(process.env.THRESHOLD_VOLTAGE_HIGH_AC_ERROR),
    LOW_DC_ERROR_SECONDARY: Number(process.env.THRESHOLD_VOLTAGE_LOW_DC_ERROR_SECONDARY),
    HIGH_DC_ERROR: Number(process.env.THRESHOLD_VOLTAGE_HIGH_DC_ERROR),
    MAINS_FAILURE: Number(process.env.THRESHOLD_VOLTAGE_MAINS_FAILURE),
    LOW_AC_ERROR: Number(process.env.THRESHOLD_VOLTAGE_LOW_AC_ERROR)
  },
  CURRENT: {
    CRITICAL_LOAD: Number(process.env.THRESHOLD_CURRENT_CRITICAL_LOAD)
  }
};

const checkThresholds = (data) => {
  let warning = '';
  let error = '';

  if (data.voltage < THRESHOLDS.VOLTAGE.LOW_AC_WARNING) {
    warning += 'Low AC voltage; ';
  }
  if (data.voltage > THRESHOLDS.VOLTAGE.HIGH_AC_WARNING) {
    warning += 'High AC voltage; ';
  }
  if (data.voltage < THRESHOLDS.VOLTAGE.LOW_DC_ERROR) {
    error += 'Low DC voltage; ';
  }
  if (data.voltage > THRESHOLDS.VOLTAGE.HIGH_AC_ERROR) {
    error += 'High AC voltage; ';
  }
  if (data.current1 > THRESHOLDS.CURRENT.CRITICAL_LOAD) {
    warning += 'Critical load; ';
  }

  return { ...data, warning, error };
};

module.exports.checkThresholds = checkThresholds;
