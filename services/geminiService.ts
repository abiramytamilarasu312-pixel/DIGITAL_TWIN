
import { GoogleGenAI, Type } from "@google/genai";
import { AIDiagnosticResponse } from "../types";

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function getIndustrialInsights(machineState: any, retryCount = 0): Promise<AIDiagnosticResponse | null> {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") {
    console.error("Gemini API Key missing. Please set GEMINI_API_KEY in environment.");
    return null;
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const { materialTest } = machineState;
    const systemInstruction = `
      🔷 DIGITAL TWIN AI – FULL SYSTEM PROMPT
      You are an AI-powered Digital Twin Engine designed for a final-year engineering project titled “Tool Health Monitoring with IoT.”
      Your primary function is to continuously process real-time sensor data and generate context-aware insights.

      CURRENT TEST CONTEXT:
      - Test Title: ${materialTest.testTitle || 'Standard Run'}
      - Batch ID: ${materialTest.batchId || 'N/A'}
      - Scenario: ${materialTest.scenario || 'NORMAL'}
      - Custom Fine-Tuning: Wear Multiplier (${materialTest.customWearMultiplier || 1.0}x), Heat Multiplier (${materialTest.customHeatMultiplier || 1.0}x)

      🔧 SENSOR INPUT EVALUATION:
      - Temperature: <40°C normal, 40-55°C elevated, >55°C overheating.
      - Vibration: <2.0g normal, 2.0-4.0g moderate, >4.0g critical.
      - RPM: Stable <10% fluctuation.
      
      🧠 YOUR TASK:
      1. Analyze Health Status: Classify as Healthy, Warning, or Critical.
      2. Detect Anomalies: Correlate with the current ${materialTest.scenario} scenario.
      3. Predict Failure: Based on tool wear and current load.
      4. Recommendations: Provide specific interventions.
      
      OUTPUT FORMAT:
      Must follow this exact JSON structure:
      {
        "healthStatus": "Healthy | Warning | Critical",
        "anomaliesDetected": ["anomaly 1", "anomaly 2"],
        "prediction": "short text prediction",
        "recommendedActions": ["action 1", "action 2"],
        "summary": "short text summary"
      }
    `;

    const iotData = {
      temperature: machineState.telemetry.temperature,
      vibration: machineState.telemetry.vibration,
      rpm: machineState.telemetry.rpm,
      current: machineState.telemetry.current,
      noiseLevel: machineState.telemetry.noiseLevel,
      timestamp: new Date(machineState.telemetry.timestamp).toISOString()
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `Input IoT Data: ${JSON.stringify(iotData)}`,
      config: {
        temperature: 0.1,
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            healthStatus: { type: Type.STRING },
            anomaliesDetected: { type: Type.ARRAY, items: { type: Type.STRING } },
            prediction: { type: Type.STRING },
            recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING }
          },
          required: ["healthStatus", "anomaliesDetected", "prediction", "recommendedActions", "summary"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as AIDiagnosticResponse;
  } catch (error: any) {
    console.error("Gemini Insight Error:", error);
    
    const isRateLimited = error?.message?.includes('429') || error?.status === 429 || error?.message?.includes('RESOURCE_EXHAUSTED');
    if (isRateLimited && retryCount < 2) {
      await wait(Math.pow(2, retryCount) * 2000);
      return getIndustrialInsights(machineState, retryCount + 1);
    }
    return null;
  }
}
