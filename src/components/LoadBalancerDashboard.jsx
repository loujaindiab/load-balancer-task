import React from 'react';
import { useLoadBalancer } from '../hooks/useLoadBalancer';

export default function LoadBalancerDashboard() {
  const { servers, currentAlgorithm, setCurrentAlgorithm, dispatchRequest, simulateBurst, resetServers, logs } = useLoadBalancer();

  return (
    <div style={{ padding: '30px', color: '#e2e8f0', backgroundColor: '#0f172a', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ color: '#38bdf8', marginBottom: '10px' }}>Adaptive Frontend Load Balancer</h1>
            <p style={{ color: '#94a3b8' }}>Live Sandbox & Routing Analytics</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '40px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#1e293b', padding: '10px 15px', borderRadius: '8px', border: '1px solid #334155' }}>
            <label style={{ fontWeight: 'bold' }}>Routing Algorithm:</label>
            <select
              value={currentAlgorithm}
              onChange={(e) => setCurrentAlgorithm(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', background: '#0f172a', color: 'white', border: '1px solid #475569', cursor: 'pointer', outline: 'none' }}
            >
              <option value="round-robin">Round Robin</option>
              <option value="weighted-round-robin">Weighted Round Robin</option>
              <option value="smooth-round-robin">Smooth Round Robin</option>
              <option value="consistent-hashing">Consistent Hashing</option>
              <option value="adaptive-feedback">Adaptive-Feedback</option>
              <option value="latency-based">Latency-Based</option>
              <option value="performance-based">Performance-Based</option>
              <option value="server-mesh">Server-Mesh</option>
              <option value="idle-join-queue">Idle-Join Queue</option>
              <option value="least-connections">Least Connections</option>
              <option value="weighted-least-connections">Weighted Least Connections</option>
            </select>
          </div>

          <button onClick={() => dispatchRequest(1)} style={btnStyle('#3b82f6')}>+ Single Request</button>
          <button onClick={simulateBurst} style={btnStyle('#f59e0b')}>🔥 Traffic Burst (50)</button>
          <button onClick={resetServers} style={btnStyle('#ef4444')}>🔄 Reset Nodes</button>
        </div>

        {/* شبكة الخوادم */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {servers.map(server => (
            <div key={server.id} style={{
              backgroundColor: '#1e293b',
              border: `2px solid ${server.isHealthy ? '#22c55e' : '#ef4444'}`,
              padding: '20px',
              borderRadius: '12px',
              boxShadow: server.isHealthy ? '0 0 15px rgba(34, 197, 94, 0.1)' : '0 0 15px rgba(239, 68, 68, 0.2)',
              opacity: server.isHealthy ? 1 : 0.6,
              transition: 'all 0.3s ease'
            }}>
              <h2 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>{server.id}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Status:</span>
                      <span style={{ color: server.isHealthy ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
                          {server.isHealthy ? 'Active ✅' : 'Offline ❌'}
                      </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Connections:</span>
                      <span style={{ color: server.connections > 120 ? '#f59e0b' : '#e2e8f0', fontWeight: 'bold' }}>{server.connections}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>CPU Load:</span>
                      <span style={{ color: server.cpu > 80 ? '#ef4444' : '#e2e8f0' }}>{server.cpu}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Latency:</span>
                      <span>{server.latency} ms</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', marginTop: '10px' }}>
                      <span>Weight: {server.weight}</span>
                      <span>Ring: {server.ringDegree}°</span>
                  </div>
              </div>
            </div>
          ))}
        </div>

        {/* سجل التنبيهات والأحداث */}
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#94a3b8' }}>System Telemetry & Logs</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {logs.length === 0 && <p style={{ color: '#64748b', margin: 0 }}>No active routing events...</p>}
                {logs.map(log => (
                    <div key={log.id} style={{
                        padding: '12px',
                        borderRadius: '6px',
                        backgroundColor: log.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                        borderLeft: `4px solid ${log.type === 'error' ? '#ef4444' : '#38bdf8'}`,
                        color: log.type === 'error' ? '#fca5a5' : '#bae6fd',
                        fontSize: '14px'
                    }}>
                        {log.msg}
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}

// دالة مساعدة لتصميم الأزرار
const btnStyle = (color) => ({
    padding: '10px 20px',
    backgroundColor: color,
    color: 'white',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'transform 0.1s',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
});