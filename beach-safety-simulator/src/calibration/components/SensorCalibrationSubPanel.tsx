/**
 * src/calibration/components/SensorCalibrationSubPanel.tsx
 * 
 * TIDES — Phase 9: Digital Twin Calibration & Real-Time Synchronization
 * 
 * Sensor Calibration Registry and Mathematical Transformation Sub-Panel.
 * Displays certified sensor calibration records, expiration status, and reference standards.
 */

import React, { useState } from 'react';
import { SensorCalibrationService } from '../SensorCalibrationService';
import {
  SensorCalibrationRecord,
  ObservationVariableType,
} from '../digitalTwinObservation.types';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Cpu,
  FileCheck,
  Sliders,
  Send,
} from 'lucide-react';

export const SensorCalibrationSubPanel: React.FC = () => {
  const calService = SensorCalibrationService.getInstance();
  const records = calService.getAllCalibrationRecords();

  const [testSensorId, setTestSensorId] = useState<string>('INCOIS-WAVE-BUOY-01');
  const [testVariable, setTestVariable] = useState<ObservationVariableType>('WAVE_HEIGHT');
  const [testRawVal, setTestRawVal] = useState<string>('1.50');
  const [testOutput, setTestOutput] = useState<any>(null);

  const handleTestCurve = (e: React.FormEvent) => {
    e.preventDefault();
    const rawNum = parseFloat(testRawVal);
    if (isNaN(rawNum)) return;

    const res = calService.calibrateObservation({
      sensorId: testSensorId,
      variable: testVariable,
      rawValue: rawNum,
      rawUnits: testVariable === 'WAVE_HEIGHT' || testVariable === 'TIDE_LEVEL' ? 'm' : testVariable === 'WIND_SPEED' ? 'km/h' : 'm/s',
    });

    setTestOutput(res);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CALIBRATED_VALID':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">VALID</span>;
      case 'EXPIRED':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800">EXPIRED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs select-none">
      {/* 1. Calibration Records Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Certified Sensor Calibration Catalog
            </h4>
          </div>
          <span className="text-[10px] text-slate-400">{records.length} Registered Certifications</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                <th className="pb-2 font-bold">Calibration ID</th>
                <th className="pb-2 font-bold">Sensor ID</th>
                <th className="pb-2 font-bold">Variable</th>
                <th className="pb-2 font-bold">Method</th>
                <th className="pb-2 font-bold">Coefficients</th>
                <th className="pb-2 font-bold">Reference Standard</th>
                <th className="pb-2 font-bold">Expiry Date</th>
                <th className="pb-2 font-bold">Uncertainty</th>
                <th className="pb-2 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {records.map((r) => (
                <tr key={r.calibrationId} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-2.5 font-bold text-white whitespace-nowrap">
                    <div>{r.calibrationId}</div>
                    <span className="text-[9px] text-slate-500 font-normal">{r.calibrationVersion}</span>
                  </td>
                  <td className="py-2.5 text-cyan-300 font-bold">{r.sensorId}</td>
                  <td className="py-2.5 text-slate-300">{r.variableType}</td>
                  <td className="py-2.5 text-slate-400 text-[10px]">{r.method}</td>
                  <td className="py-2.5 text-slate-300 font-mono text-[10px]">
                    {JSON.stringify(r.coefficients).replace(/"/g, '')}
                  </td>
                  <td className="py-2.5 text-slate-400 max-w-xs truncate" title={r.referenceInstrument}>
                    {r.referenceInstrument}
                  </td>
                  <td className="py-2.5 text-slate-400 whitespace-nowrap">
                    {new Date(r.expiryDate).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 text-slate-300">±{r.uncertaintyBand} {r.calibratedUnits}</td>
                  <td className="py-2.5">{getStatusBadge(r.validationStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Interactive Calibration Curve Tester */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Interactive Calibration Curve Validator
          </h4>
        </div>

        <form onSubmit={handleTestCurve} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-[11px]">
          <div>
            <label className="text-slate-400 block mb-1">Target Sensor</label>
            <select
              value={testSensorId}
              onChange={(e) => {
                setTestSensorId(e.target.value);
                if (e.target.value === 'INCOIS-WAVE-BUOY-01') setTestVariable('WAVE_HEIGHT');
                else if (e.target.value === 'IMD-AWS-VIZAG-COAST') setTestVariable('WIND_SPEED');
                else if (e.target.value === 'NIOT-TIDE-GAUGE-01') setTestVariable('TIDE_LEVEL');
                else if (e.target.value === 'ADCP-CURRENT-METER-01') setTestVariable('WATER_CURRENT');
                else setTestVariable('WATER_TEMPERATURE');
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="INCOIS-WAVE-BUOY-01">INCOIS Wave Buoy 01 (Wave Height)</option>
              <option value="IMD-AWS-VIZAG-COAST">IMD AWS Vizag Coast (Wind Speed)</option>
              <option value="NIOT-TIDE-GAUGE-01">NIOT Tide Gauge 01 (Tide Level)</option>
              <option value="ADCP-CURRENT-METER-01">NIOT ADCP 01 (Water Current)</option>
              <option value="WATER-TEMP-SENS-01">Water Temperature Sensor 01</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Input Raw Value</label>
            <input
              type="text"
              value={testRawVal}
              onChange={(e) => setTestRawVal(e.target.value)}
              placeholder="e.g. 1.50"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="text-[10px] text-slate-400">
            <span>Certification:</span>
            <div className="text-cyan-400 text-[10px] font-bold">NPL / NIOT National Reference</div>
          </div>

          <button
            type="submit"
            className="w-full py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-cyan-600/20"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Compute Calibrated Value</span>
          </button>
        </form>

        {testOutput && (
          <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-slate-700 space-y-1.5">
            <div className="flex items-center justify-between font-bold text-xs">
              <span className="text-slate-300">Calibration Output:</span>
              <span className="text-emerald-300">
                Calibrated: {testOutput.calibratedValue} {testOutput.calibratedUnits} (±{testOutput.uncertainty} {testOutput.calibratedUnits})
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-800 pt-1">
              <span>Applied Record: {testOutput.calibrationRecordId || 'Uncalibrated'} ({testOutput.calibrationVersion || 'N/A'})</span>
              <span>Delta: {(testOutput.calibratedValue - parseFloat(testRawVal)).toFixed(3)} {testOutput.calibratedUnits}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

