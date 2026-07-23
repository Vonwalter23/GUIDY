/**
 * GUIDY - POI Datasources
 * Public API for POI datasource layer
 * 
 * STAGE 4.1: POI Datasource Layer
 */

// Base Network Client
export { BaseNetworkClient } from './BaseNetworkClient';
export type { NetworkConfig, NetworkResponse } from './BaseNetworkClient';
export { NetworkError } from './BaseNetworkClient';
export { DEFAULT_NETWORK_CONFIG } from './BaseNetworkClient';

// Overpass Datasource
export { OverpassDatasource } from './OverpassDatasource';
export type { OverpassConfig } from './OverpassDatasource';
export { DEFAULT_OVERPASS_CONFIG } from './OverpassDatasource';

// Datasource Factory
export { DatasourceFactory, datasourceFactory } from './DatasourceFactory';
export type { DatasourceType, DatasourceFactoryConfig } from './DatasourceFactory';
export { DEFAULT_FACTORY_CONFIG } from './DatasourceFactory';
