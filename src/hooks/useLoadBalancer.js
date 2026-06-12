import { useState, useEffect, useCallback, useRef } from 'react';

const getHashDegree = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 360);
};

const initialServers = [
  { id: 'Node-1 (Primary)', isHealthy: true, connections: 10, cpu: 40, latency: 12, weight: 5, currentWeight: 0, ringDegree: 45, adaptiveWeight: 100 },
  { id: 'Node-2 (Replica)', isHealthy: true, connections: 120, cpu: 75, latency: 45, weight: 3, currentWeight: 0, ringDegree: 180, adaptiveWeight: 100 },
  { id: 'Node-3 (Overflow)', isHealthy: true, connections: 0, cpu: 5, latency: 110, weight: 1, currentWeight: 0, ringDegree: 300, adaptiveWeight: 100 }
];

export const useLoadBalancer = () => {
  const [servers, setServers] = useState(initialServers);
  const [currentAlgorithm, setCurrentAlgorithm] = useState('round-robin');
  const [logs, setLogs] = useState([]);
  const [flashNode, setFlashNode] = useState(null);

  const rrIndex = useRef(0);
  
  // 🟢 التعديل: استخدام مرجع لتخزين أحدث حالة للخوادم لتجنب تكرار React Strict Mode
  const latestServers = useRef(servers);

  useEffect(() => {
    latestServers.current = servers;
  }, [servers]);

  useEffect(() => {
    rrIndex.current = 0;
  }, [currentAlgorithm]);

  const addLog = (msg, type = 'info') => {
     setLogs(prev => [{ id: Date.now() + Math.random(), msg, type }, ...prev].slice(0, 5));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      // 🟢 نقرأ البيانات من المرجع بدلاً من دالة التحديث لتجنب الطباعة المزدوجة
      const currentServers = latestServers.current;
      
      const nextServers = currentServers.map(server => {
        let newConnections = Math.max(0, server.connections - Math.floor(Math.random() * 2)); 
        let newCpu = Math.max(5, server.cpu - (newConnections === 0 ? 10 : 2)); 

        let isHealthy = server.isHealthy;
        
        if ((server.connections > 150 || server.cpu > 90) && isHealthy) {
          addLog(`🚨 ${server.id} went offline! (Overloaded)`, 'error');
          isHealthy = false;
          newConnections = 0; 
          newCpu = 0;
        }

        let newAdaptiveWeight = server.adaptiveWeight || 100;
        if (newCpu > 70) {
            newAdaptiveWeight = Math.max(10, newAdaptiveWeight - 30); 
        } else {
            newAdaptiveWeight = Math.min(100, newAdaptiveWeight + 10); 
        }

        return { ...server, cpu: newCpu, connections: newConnections, isHealthy, adaptiveWeight: newAdaptiveWeight };
      });

      setServers(nextServers);
    }, 5000); 
    return () => clearInterval(interval);
  }, []);

  const dispatchRequest = useCallback((count = 1) => {
    const activeCount = servers.filter(s => s.isHealthy).length;
    if (activeCount === 0) {
      addLog("CRITICAL: All servers are offline! No routes available.", 'error');
      return;
    }

    let loopRrIndex = rrIndex.current;
    let lastTargetId = null;
    
    let updatedServers = servers.map(s => ({ ...s }));

    for(let i = 0; i < count; i++) {
        let activeNodes = updatedServers.filter(s => s.isHealthy);
        if (activeNodes.length === 0) break; 

        const clientId = `client-${Math.floor(Math.random() * 10000)}`;
        let targetIndex = 0;

        switch (currentAlgorithm) {
          case 'round-robin':
            targetIndex = updatedServers.findIndex(s => s.id === activeNodes[loopRrIndex % activeNodes.length].id);
            loopRrIndex++; 
            break;

          case 'weighted-round-robin':
            const totalWeight = activeNodes.reduce((sum, s) => sum + s.weight, 0);
            let currentVal = loopRrIndex % totalWeight;
            let weightSum = 0;
            for (let j = 0; j < activeNodes.length; j++) {
              weightSum += activeNodes[j].weight;
              if (currentVal < weightSum) {
                targetIndex = updatedServers.findIndex(s => s.id === activeNodes[j].id);
                break;
              }
            }
            loopRrIndex++; 
            break;

          case 'smooth-round-robin':
            let total = 0;
            let best = activeNodes[0];
            activeNodes.forEach(s => {
              s.currentWeight += s.weight;
              total += s.weight;
              if (s.currentWeight > best.currentWeight) best = s;
            });
            best.currentWeight -= total;
            targetIndex = updatedServers.findIndex(s => s.id === best.id);
            break;

          case 'least-connections':
            const leastConn = activeNodes.reduce((p, c) => p.connections < c.connections ? p : c);
            targetIndex = updatedServers.findIndex(s => s.id === leastConn.id);
            break;

          case 'weighted-least-connections':
            const wLeastConn = activeNodes.reduce((p, c) => (p.connections / p.weight) < (c.connections / c.weight) ? p : c);
            targetIndex = updatedServers.findIndex(s => s.id === wLeastConn.id);
            break;

          case 'consistent-hashing':
            const requestDeg = getHashDegree(clientId);
            const sortedNodes = [...activeNodes].sort((a, b) => a.ringDegree - b.ringDegree);
            let targetNode = sortedNodes.find(node => node.ringDegree >= requestDeg);
            if (!targetNode) targetNode = sortedNodes[0];
            targetIndex = updatedServers.findIndex(s => s.id === targetNode.id);
            break;

          case 'latency-based':
            const fastest = activeNodes.reduce((p, c) => p.latency < c.latency ? p : c);
            targetIndex = updatedServers.findIndex(s => s.id === fastest.id);
            break;

          case 'performance-based':
            const leastCpu = activeNodes.reduce((p, c) => p.cpu < c.cpu ? p : c);
            targetIndex = updatedServers.findIndex(s => s.id === leastCpu.id);
            break;

          case 'adaptive-feedback':
            const totalAdaptiveWeight = activeNodes.reduce((sum, s) => sum + s.adaptiveWeight, 0);
            const r = Math.random() * totalAdaptiveWeight; 
            let cumulative = 0;
            
            for (let j = 0; j < activeNodes.length; j++) {
               cumulative += activeNodes[j].adaptiveWeight;
               if (r <= cumulative) {
                 targetIndex = updatedServers.findIndex(s => s.id === activeNodes[j].id);
                 break;
               }
            }
            break;

          case 'idle-join-queue':
            const idle = activeNodes.find(s => s.connections === 0);
            const target = idle || activeNodes.reduce((p, c) => p.connections < c.connections ? p : c);
            targetIndex = updatedServers.findIndex(s => s.id === target.id);
            break;

          // ... (باقي الكود كما هو، فقط استبدلي قسم server-mesh)

          case 'server-mesh':
            // 🟢 تطبيق منطق الـ Service Mesh مع Circuit Breaker
            // نحتاج لزيادة عداد إخفاقات خاص لكل خادم (Circuit Breaker)
            const meshNodes = activeNodes.filter(n => (n.failures || 0) < 3);
            
            if (meshNodes.length === 0) {
                addLog("CRITICAL: Circuit Breaker Open - All mesh nodes failed", 'error');
                break;
            }

            const meshTarget = meshNodes[loopRrIndex % meshNodes.length];
            
            // محاكاة احتمالية فشل (مثل كود الأستاذ Math.random < 0.2)
            if (Math.random() < 0.2) {
                updatedServers = updatedServers.map(s => 
                    s.id === meshTarget.id ? { ...s, failures: (s.failures || 0) + 1 } : s
                );
                addLog(`⚠️ Service Mesh: Node ${meshTarget.id} failed. Retry/Fallback initiated.`, 'warn');
            } else {
                targetIndex = updatedServers.findIndex(s => s.id === meshTarget.id);
                // تصفير الإخفاقات عند النجاح
                updatedServers[targetIndex].failures = 0;
            }
            loopRrIndex++;
            break;

// ... (بقية الكود كما هو)

          default:
            targetIndex = updatedServers.findIndex(s => s.id === activeNodes[0].id);
        }

        updatedServers[targetIndex] = {
          ...updatedServers[targetIndex],
          connections: updatedServers[targetIndex].connections + 1,
          cpu: Math.min(100, updatedServers[targetIndex].cpu + 1),
          latency: updatedServers[targetIndex].latency + Math.floor(Math.random() * 2)
        };

        lastTargetId = updatedServers[targetIndex].id;
    }

    setServers(updatedServers);

    if (currentAlgorithm === 'round-robin' || currentAlgorithm === 'weighted-round-robin') {
       rrIndex.current += count;
    }

    if(count === 1) {
        setFlashNode(lastTargetId);
        setTimeout(() => setFlashNode(null), 300);
        addLog(`✅ Routed single request to ${lastTargetId} via ${currentAlgorithm}`);
    } else {
        addLog(`🔥 Burst (${count} reqs) perfectly distributed via ${currentAlgorithm}`);
    }

  }, [servers, currentAlgorithm]);

  const simulateBurst = () => dispatchRequest(50); 
  
  const resetServers = () => { 
    setServers(initialServers); 
    rrIndex.current = 0; 
    addLog("🔄 System reset to initial state", "info"); 
  };

  return { servers, currentAlgorithm, setCurrentAlgorithm, dispatchRequest, simulateBurst, resetServers, logs, flashNode };
};