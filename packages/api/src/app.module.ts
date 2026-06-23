import { Module, type DynamicModule } from "@nestjs/common";
import { HealthController } from "./controllers/health.controller.js";
import { VpsController } from "./controllers/vps.controller.js";
import { createKeyService, type KeyService } from "./services/keyService.js";
import { SshService } from "./services/ssh.service.js";
import { VpsService } from "./services/vps.service.js";
import { createVpsStore, type VpsStore } from "./store/vpsStore.js";

export const VPS_STORE = Symbol("VPS_STORE");
export const KEY_SERVICE = Symbol("KEY_SERVICE");

export type AppDependencies = { store?: VpsStore; keys?: KeyService };

export class AppModule {}

Module({})(AppModule);

export function createAppModule(deps: AppDependencies = {}): DynamicModule {
  return {
    module: AppModule,
    controllers: [HealthController, VpsController],
    providers: [
      { provide: VPS_STORE, useValue: deps.store ?? createVpsStore() },
      { provide: KEY_SERVICE, useValue: deps.keys ?? createKeyService() },
      SshService,
      {
        provide: VpsService,
        inject: [VPS_STORE, KEY_SERVICE, SshService],
        useFactory: (store: VpsStore, keys: KeyService, ssh: SshService) => new VpsService(store, keys, ssh)
      }
    ]
  };
}
