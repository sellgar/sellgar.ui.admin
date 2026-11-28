import { Injectable } from '@sellgar/app';

import { EnvConfigInterface } from './env-config.interface.ts';

@Injectable()
export class EnvConfig implements EnvConfigInterface {
  get<Key extends keyof ImportMetaEnv>(key: Key): ImportMetaEnv[Key] {
    return import.meta.env[key];
  }
}
