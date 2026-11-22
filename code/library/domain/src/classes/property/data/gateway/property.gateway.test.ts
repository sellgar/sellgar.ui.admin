import axios, { type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import type { RequestExecutorInterface, RequestOperation } from '@sellgar/app';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PropertyService } from '../../application/property.service.ts';
import type { ConfigInterface } from '../../../../infrastructure/config/config.interface.ts';
import type { DeviceServiceInterface } from '../../../../infrastructure/device/service/device-service.interface.ts';
import { PropertyEntity } from '../../domain/property.entity.ts';
import { PropertyGateway } from './property.gateway.ts';

describe('Property catalogue through HTTP transport', () => {
  const previousAdapter = axios.defaults.adapter;
  const properties = Array.from({ length: 59 }, (_, index) => ({
    code: `property-${index.toString().padStart(2, '0')}`,
    name: `Свойство ${index}`,
    kind: 'TEXT',
    description: null,
    unitCode: null,
    unit: null,
    version: 1,
    options: [],
    createdAt: '2026-11-20T12:00:00.000Z',
    updatedAt: '2026-11-20T12:00:00.000Z',
  }));
  let requests: InternalAxiosRequestConfig[];
  let gateway: PropertyGateway;
  let service: PropertyService;

  beforeEach(() => {
    requests = [];
    axios.defaults.adapter = (async (config) => {
      requests.push(config);
      const start = config.params?.nextToken === 'page-2' ? 50 : 0;
      return {
        config,
        data: {
          items: properties.slice(start, start + 50),
          meta: { limit: 50, nextToken: start === 0 ? 'page-2' : null },
        },
        headers: {},
        status: 200,
        statusText: 'OK',
      };
    }) satisfies AxiosAdapter;
    const executor = {
      run: async (_options: unknown, operation: RequestOperation<unknown>) =>
        operation({ signal: new AbortController().signal }),
    } as RequestExecutorInterface;
    gateway = new PropertyGateway(
      { get: () => 'https://admin.test/api' } as unknown as ConfigInterface,
      { getUniqueId: () => 'property-test-device' } as DeviceServiceInterface,
      executor,
    );
    service = new PropertyService(gateway);
  });

  afterEach(() => {
    axios.defaults.adapter = previousAdapter;
  });

  it('returns every property for templates beyond the first HTTP page', async () => {
    const result = await service.getCatalogue();

    expect(result).toHaveLength(59);
    expect(result.map((item) => item.code)).toEqual(properties.map((item) => item.code));
    expect(result.every((item) => item instanceof PropertyEntity)).toBe(true);
    expect(requests.map((request) => request.params?.nextToken)).toEqual([undefined, 'page-2']);
  });

  it('does not return a partial catalogue when a later page fails', async () => {
    const adapter = axios.defaults.adapter as AxiosAdapter;
    axios.defaults.adapter = async (config) => {
      if (config.params?.nextToken === 'page-2') throw new Error('Next page unavailable');
      return adapter(config);
    };

    await expect(service.getCatalogue()).rejects.toThrow('Next page unavailable');
  });
});
