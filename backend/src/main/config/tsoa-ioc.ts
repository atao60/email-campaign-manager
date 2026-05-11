import type { IocContainer, ServiceIdentifier } from '@tsoa/runtime';

import { type DiContainer } from '@infrastructure/di/DiContainer';
import { DI_TYPES } from '@infrastructure/di/Types';
import { CampaignController } from '@presentation/rest/controllers/CampaignController';
import { StatusController } from '@presentation/rest/controllers/StatusController';
import { HealthController } from '@presentation/rest/controllers/HealthController';

// Will be initialized when the app starts
let appContainer: DiContainer;

export const setContainer = (container: DiContainer) => {
  appContainer = container;
};

/**
 * The controllers are registered here, not in {@link DiContainer}.
 * DiContainer only holds the Use Cases.
 */
export const iocContainer: IocContainer = {
  get: <T>(controller: ServiceIdentifier<T>): T => {
    let identifierName: string;

    if (typeof controller === 'string') {
      // It's already a string identifier
      identifierName = controller;
    } else if (typeof controller === 'symbol') {
      // Convert symbol to string if your DI container needs a string
      identifierName = controller.toString();
    } else {
      // If it's not a string or symbol, it is the actual class constructor
      // (e.g., CampaignController), so it is 100% safe to read `.name`
      identifierName = controller.name;
    }

    switch (identifierName) {
      case 'HealthController':
        return new HealthController() as T;

      case 'StatusController':
        return new StatusController(appContainer.resolve(DI_TYPES.GetCampaignStatusUseCase)) as T;

      case 'CampaignController':
        return new CampaignController(
          appContainer.resolve(DI_TYPES.MergeMailingListsUseCase),
          appContainer.resolve(DI_TYPES.SendCampaignUseCase),
          appContainer.resolve(DI_TYPES.GetCampaignsUseCase),
          appContainer.resolve(DI_TYPES.GetCampaignDetailsUseCase),
          appContainer.resolve(DI_TYPES.UpdateDeliveryStatusUseCase)
        ) as T;

      default:
        throw new Error(`Controller ${identifierName} not registered in IoC bridge.`);
    }
  }
};
