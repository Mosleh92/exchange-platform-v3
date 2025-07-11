/**
 * Multi-Region Configuration for Global Deployment
 * Phase 3: Global Expansion & Advanced Features
 */

const regions = {
  'us-east-1': {
    name: 'North America (Virginia)',
    code: 'US-EAST',
    timezone: 'America/New_York',
    currencies: ['USD', 'CAD'],
    languages: ['en', 'es', 'fr'],
    datacenter: {
      provider: 'AWS',
      region: 'us-east-1',
      cdn_endpoint: 'https://cdn-us-east.exchange.com',
      latency_target: 50, // milliseconds
    },
    compliance: {
      jurisdiction: 'USA',
      regulations: ['SEC', 'CFTC', 'FinCEN'],
      data_residency: true,
    },
    payment_gateways: ['stripe', 'paypal', 'wire_transfer'],
    trading_sessions: {
      market_open: '09:30',
      market_close: '16:00',
      extended_hours: true,
    }
  },
  
  'eu-west-1': {
    name: 'Europe (Ireland)',
    code: 'EU-WEST',
    timezone: 'Europe/Dublin',
    currencies: ['EUR', 'GBP', 'CHF'],
    languages: ['en', 'de', 'fr', 'es', 'it'],
    datacenter: {
      provider: 'AWS',
      region: 'eu-west-1',
      cdn_endpoint: 'https://cdn-eu-west.exchange.com',
      latency_target: 30,
    },
    compliance: {
      jurisdiction: 'EU',
      regulations: ['MiFID II', 'GDPR', 'PSD2'],
      data_residency: true,
    },
    payment_gateways: ['stripe', 'adyen', 'sepa', 'wire_transfer'],
    trading_sessions: {
      market_open: '08:00',
      market_close: '16:30',
      extended_hours: false,
    }
  },
  
  'ap-southeast-1': {
    name: 'Asia Pacific (Singapore)',
    code: 'APAC',
    timezone: 'Asia/Singapore',
    currencies: ['SGD', 'JPY', 'HKD', 'AUD'],
    languages: ['en', 'zh', 'ja', 'ko'],
    datacenter: {
      provider: 'AWS',
      region: 'ap-southeast-1',
      cdn_endpoint: 'https://cdn-apac.exchange.com',
      latency_target: 25,
    },
    compliance: {
      jurisdiction: 'SINGAPORE',
      regulations: ['MAS', 'ASIC'],
      data_residency: true,
    },
    payment_gateways: ['stripe', 'adyen', 'alipay', 'wire_transfer'],
    trading_sessions: {
      market_open: '09:00',
      market_close: '17:00',
      extended_hours: true,
    }
  }
};

const failover_regions = {
  'us-east-1': ['us-west-2', 'ca-central-1'],
  'eu-west-1': ['eu-central-1', 'eu-west-2'],
  'ap-southeast-1': ['ap-northeast-1', 'ap-south-1']
};

const load_balancing_config = {
  algorithm: 'geographic_proximity',
  health_check_interval: 30, // seconds
  failover_threshold: 3, // failed checks
  sticky_sessions: true,
  session_timeout: 1800, // 30 minutes
};

const cdn_config = {
  provider: 'CloudFlare',
  cache_settings: {
    static_assets: '31536000', // 1 year
    api_responses: '300', // 5 minutes
    user_content: '86400', // 1 day
  },
  compression: {
    enabled: true,
    formats: ['gzip', 'brotli'],
    level: 6,
  },
  security: {
    waf_enabled: true,
    ddos_protection: true,
    rate_limiting: true,
  }
};

module.exports = {
  regions,
  failover_regions,
  load_balancing_config,
  cdn_config,
  
  getRegionByCode: (code) => {
    return Object.values(regions).find(region => region.code === code);
  },
  
  getRegionByUser: (userLocation) => {
    // Simple geo-routing logic
    const { latitude, longitude } = userLocation;
    
    if (latitude >= 25 && latitude <= 49 && longitude >= -125 && longitude <= -66) {
      return regions['us-east-1'];
    } else if (latitude >= 35 && latitude <= 71 && longitude >= -10 && longitude <= 40) {
      return regions['eu-west-1'];
    } else {
      return regions['ap-southeast-1'];
    }
  },
  
  getOptimalEndpoint: (region, service) => {
    const regionConfig = regions[region];
    if (!regionConfig) return null;
    
    return {
      api: `https://api-${regionConfig.code.toLowerCase()}.exchange.com`,
      websocket: `wss://ws-${regionConfig.code.toLowerCase()}.exchange.com`,
      cdn: regionConfig.datacenter.cdn_endpoint,
    };
  }
};