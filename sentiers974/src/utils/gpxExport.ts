/**
 * Utilitaire pour exporter les traces GPS au format GPX
 * Compatible avec Strava, Garmin Connect, etc.
 */

export interface GPXTrackPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: number;
  speed?: number;
  accuracy?: number;
}

export interface GPXSessionData {
  name: string;
  sport: string;
  startTime: number;
  endTime: number;
  trackPoints: GPXTrackPoint[];
  distance: number;
  duration: number;
  elevationGain: number;
  elevationLoss: number;
  maxSpeed: number;
  avgSpeed: number;
}

export class GPXExporter {
  static generateGPX(sessionData: GPXSessionData): string {
    const startDate = new Date(sessionData.startTime).toISOString();
    const trackName = sessionData.name || `${sessionData.sport} - ${new Date(sessionData.startTime).toLocaleDateString('fr-FR')}`;
    
    let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Sentiers974" 
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" 
  xmlns="http://www.topografix.com/GPX/1/1" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  
  <metadata>
    <name>${this.escapeXml(trackName)}</name>
    <desc>Activité ${sessionData.sport} enregistrée avec Sentiers 974 - La Réunion</desc>
    <author>
      <name>Sentiers 974</name>
    </author>
    <time>${startDate}</time>
  </metadata>
  
  <trk>
    <name>${this.escapeXml(trackName)}</name>
    <type>${sessionData.sport}</type>
    <trkseg>`;

    // Ajouter tous les points de trace
    sessionData.trackPoints.forEach(point => {
      const timestamp = new Date(point.timestamp).toISOString();
      
      gpxContent += `
      <trkpt lat="${point.latitude.toFixed(7)}" lon="${point.longitude.toFixed(7)}">`;
      
      if (point.altitude) {
        gpxContent += `
        <ele>${point.altitude.toFixed(1)}</ele>`;
      }
      
      gpxContent += `
        <time>${timestamp}</time>`;
      
      // Extensions pour vitesse et précision (format Garmin)
      if (point.speed || point.accuracy) {
        gpxContent += `
        <extensions>`;
        
        if (point.speed) {
          gpxContent += `
          <speed>${point.speed.toFixed(2)}</speed>`;
        }
        
        if (point.accuracy) {
          gpxContent += `
          <accuracy>${point.accuracy.toFixed(1)}</accuracy>`;
        }
        
        gpxContent += `
        </extensions>`;
      }
      
      gpxContent += `
      </trkpt>`;
    });

    gpxContent += `
    </trkseg>
  </trk>`;

    // Ajouter les statistiques comme waypoint de résumé
    gpxContent += `
  <wpt lat="${sessionData.trackPoints[0]?.latitude || 0}" lon="${sessionData.trackPoints[0]?.longitude || 0}">
    <name>Résumé - ${this.escapeXml(trackName)}</name>
    <desc>Distance: ${sessionData.distance.toFixed(2)}km | Durée: ${this.formatDuration(sessionData.duration)} | D+: +${sessionData.elevationGain.toFixed(0)}m | Vitesse max: ${sessionData.maxSpeed.toFixed(1)}km/h | Vitesse moy: ${sessionData.avgSpeed.toFixed(1)}km/h | La Réunion 974</desc>
    <type>summary</type>
  </wpt>`;

    gpxContent += `
</gpx>`;

    return gpxContent;
  }

  static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  static formatDuration(durationMs: number): string {
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h${minutes.toString().padStart(2, '0')}m${seconds.toString().padStart(2, '0')}s`;
    }
    return `${minutes}m${seconds.toString().padStart(2, '0')}s`;
  }

  // Convertir les données de tracking en format GPX
  static convertTrackingDataToGPX(
    trackingPath: Array<{latitude: number; longitude: number}>,
    chartData: Array<{time: number; altitude: number | null; speed: number; timestamp: number}>,
    sessionInfo: {
      sport: string;
      startTime: number;
      endTime: number;
      distance: number;
      duration: number;
      elevationGain: number;
      elevationLoss: number;
      maxSpeed: number;
      avgSpeed: number;
    }
  ): GPXSessionData {
    
    // Fusionner trackingPath avec chartData pour avoir toutes les données
    const trackPoints: GPXTrackPoint[] = trackingPath.map((point, index) => {
      // Trouver les données correspondantes dans chartData
      const chartPoint = chartData.find((_, i) => i === index) || chartData[Math.min(index, chartData.length - 1)];
      
      return {
        latitude: point.latitude,
        longitude: point.longitude,
        altitude: chartPoint?.altitude || undefined,
        timestamp: chartPoint?.timestamp || (sessionInfo.startTime + (index * 5000)), // Estimation si pas de timestamp
        speed: chartPoint?.speed,
        accuracy: undefined // On n'a pas cette donnée pour l'instant
      };
    });

    const sessionName = `${sessionInfo.sport} La Réunion`;

    return {
      name: sessionName,
      sport: sessionInfo.sport,
      startTime: sessionInfo.startTime,
      endTime: sessionInfo.endTime,
      trackPoints,
      distance: sessionInfo.distance,
      duration: sessionInfo.duration,
      elevationGain: sessionInfo.elevationGain,
      elevationLoss: sessionInfo.elevationLoss,
      maxSpeed: sessionInfo.maxSpeed,
      avgSpeed: sessionInfo.avgSpeed
    };
  }
}