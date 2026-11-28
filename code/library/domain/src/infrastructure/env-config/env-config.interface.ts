export abstract class EnvConfigInterface {
  abstract get<Key extends keyof ImportMetaEnv>(key: Key): ImportMetaEnv[Key];
}
