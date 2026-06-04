import React, { useEffect, useState, useRef } from 'react';
import { getCampusLocation, saveCampusLocation, createCampusLocation } from '../services/api';

const CampusLocation = () => {
  const [campuses, setCampuses] = useState([]);
  const [selectedCampusName, setSelectedCampusName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form Fields
  const [campusName, setCampusName] = useState('');
  const [latitude, setLatitude] = useState(23.259933); // Default SISTec Bhopal approx
  const [longitude, setLongitude] = useState(77.412615);
  const [radius, setRadius] = useState(200); // Default 200m radius
  const [isNewMode, setIsNewMode] = useState(false);

  // Leaflet refs
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  const token = localStorage.getItem('token');

  // Load all campus locations from backend
  const fetchCampusLocations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCampusLocation(token);
      setCampuses(data || []);
      if (data && data.length > 0) {
        setSelectedCampusName(data[0].campus);
        loadCampusDetails(data[0]);
      } else {
        setIsNewMode(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch campus locations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampusLocations();
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!window.L) {
      console.error("Leaflet CDN is not loaded yet.");
      return;
    }

    if (!mapInstanceRef.current && mapRef.current) {
      mapInstanceRef.current = window.L.map(mapRef.current).setView([latitude, longitude], 15);
      
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Handle map clicks to update marker
      mapInstanceRef.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        updateMarkerAndCircle(lat, lng);
      });
    }

    // Update marker on initial render/ref availability
    if (mapInstanceRef.current) {
      updateMarkerAndCircle(latitude, longitude, radius);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  }, [loading]);

  const loadCampusDetails = (campusObj) => {
    setIsNewMode(false);
    setCampusName(campusObj.campus);
    const lat = parseFloat(campusObj.latitude) || 23.2599;
    const lng = parseFloat(campusObj.longitude) || 77.4126;
    const rad = parseFloat(campusObj.radius) || 200;
    setLatitude(lat);
    setLongitude(lng);
    setRadius(rad);

    updateMarkerAndCircle(lat, lng, rad);
  };

  const handleCampusSelectChange = (e) => {
    const name = e.target.value;
    if (name === 'NEW') {
      setIsNewMode(true);
      setSelectedCampusName('NEW');
      setCampusName('');
      setRadius(200);
      // center on browser GPS if available, otherwise keep default
      detectCurrentLocation();
    } else {
      setSelectedCampusName(name);
      const found = campuses.find(c => c.campus === name);
      if (found) {
        loadCampusDetails(found);
      }
    }
  };

  const updateMarkerAndCircle = (lat, lng, radiusValue = radius) => {
    if (!mapInstanceRef.current || !window.L) return;

    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    const numRad = parseFloat(radiusValue);

    if (isNaN(numLat) || isNaN(numLng)) return;

    setLatitude(numLat);
    setLongitude(numLng);

    // Update/create Marker
    if (markerRef.current) {
      markerRef.current.setLatLng([numLat, numLng]);
    } else {
      markerRef.current = window.L.marker([numLat, numLng], { draggable: true })
        .addTo(mapInstanceRef.current);
      
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current.getLatLng();
        updateMarkerAndCircle(pos.lat, pos.lng);
      });
    }

    // Update/create Radius Circle
    if (!isNaN(numRad)) {
      if (circleRef.current) {
        circleRef.current.setLatLng([numLat, numLng]);
        circleRef.current.setRadius(numRad);
      } else {
        circleRef.current = window.L.circle([numLat, numLng], {
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.2,
          radius: numRad
        }).addTo(mapInstanceRef.current);
      }
    }

    // Center view
    mapInstanceRef.current.panTo([numLat, numLng]);
  };

  const handleFieldChange = (field, value) => {
    if (field === 'lat') {
      setLatitude(value);
      updateMarkerAndCircle(value, longitude, radius);
    } else if (field === 'lng') {
      setLongitude(value);
      updateMarkerAndCircle(latitude, value, radius);
    } else if (field === 'radius') {
      setRadius(value);
      updateMarkerAndCircle(latitude, longitude, value);
    }
  };

  const detectCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          updateMarkerAndCircle(lat, lng, radius);
        },
        (err) => {
          console.warn("Could not determine current position:", err);
        }
      );
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!campusName.trim()) {
      setError('Please provide a campus name.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      token,
      campus: campusName.trim(),
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: radius.toString()
    };

    try {
      if (isNewMode) {
        await createCampusLocation(payload);
        setSuccessMsg('New campus location created successfully.');
      } else {
        await saveCampusLocation(payload);
        setSuccessMsg('Campus location updated successfully.');
      }
      
      // Reload list
      const freshData = await getCampusLocation(token);
      setCampuses(freshData || []);
      setIsNewMode(false);
      setSelectedCampusName(payload.campus);
    } catch (err) {
      setError(err.message || 'Failed to save campus geofence details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-content animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Configure GPS coordinate boundaries and geofence radius for digital pass verification
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
          <div className="spinner" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          
          {/* Settings form */}
          <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h4 style={{ color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Geofence Settings
            </h4>

            {error && (
              <div className="badge badge-danger" style={{ display: 'block', textAlign: 'center', padding: '0.5rem' }}>
                {error}
              </div>
            )}

            {successMsg && (
              <div className="badge badge-success" style={{ display: 'block', textAlign: 'center', padding: '0.5rem' }}>
                {successMsg}
              </div>
            )}

            <div>
              <label className="input-label">Select Campus to Configure</label>
              <select 
                className="input-control" 
                value={selectedCampusName} 
                onChange={handleCampusSelectChange}
              >
                {campuses.map(c => (
                  <option key={c.campus} value={c.campus}>{c.campus}</option>
                ))}
                <option value="NEW">+ Add New Campus Location</option>
              </select>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="input-label">Campus Name</label>
                <input 
                  type="text" 
                  className="input-control"
                  placeholder="e.g. SISTec-Ratibad"
                  value={campusName}
                  onChange={(e) => setCampusName(e.target.value)}
                  disabled={!isNewMode}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="input-label">Latitude</label>
                  <input 
                    type="number" 
                    step="0.000001"
                    className="input-control"
                    value={latitude}
                    onChange={(e) => handleFieldChange('lat', parseFloat(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Longitude</label>
                  <input 
                    type="number" 
                    step="0.000001"
                    className="input-control"
                    value={longitude}
                    onChange={(e) => handleFieldChange('lng', parseFloat(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="input-label">Geofence Radius (meters)</label>
                  <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{radius} m</span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="1500" 
                  step="10"
                  style={{ width: '100%', accentColor: 'var(--accent-primary)', marginTop: '0.5rem', marginBottom: '0.5rem' }}
                  value={radius}
                  onChange={(e) => handleFieldChange('radius', parseInt(e.target.value))}
                />
                <input 
                  type="number" 
                  className="input-control"
                  value={radius}
                  onChange={(e) => handleFieldChange('radius', parseInt(e.target.value) || 0)}
                  min="10"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ flex: 1 }}
                  onClick={detectCurrentLocation}
                >
                  📍 Find Me
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1.5 }}
                  disabled={saving}
                >
                  {saving ? <div className="spinner" style={{ width: '18px', height: '18px' }}></div> : 'Save Boundary'}
                </button>
              </div>
            </form>
          </div>

          {/* Interactive Map Visualizer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="input-label">Interactive Boundary Map</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Click map or drag marker to adjust center</span>
            </div>
            
            <div 
              ref={mapRef} 
              style={{ 
                height: '450px', 
                width: '100%', 
                borderRadius: '16px', 
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                zIndex: 1
              }} 
            />
          </div>

        </div>
      )}
    </div>
  );
};

export default CampusLocation;
