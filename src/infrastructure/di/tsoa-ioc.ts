import { type DiContainer } from './DiContainer';
import { DI_TYPES } from './Types';
import { CampaignController } from '@presentation/rest/controllers/CampaignController';
import { StatusController } from '@presentation/rest/controllers/StatusController';
import { HealthController } from '@presentation/rest/controllers/HealthController';

// Will be initialized when the app starts
let appContainer: DiContainer;

export const setContainer = (container: DiContainer) => {
  appContainer = container;
};

export const iocContainer = {
  get: <T>(controller: { name: string }): T => {
    switch (controller.name) {
      case 'HealthController':
        return new HealthController() as T;

      case 'StatusController':
        return new StatusController(appContainer.resolve(DI_TYPES.GetCampaignStatusUseCase)) as T;

      case 'CampaignController':
        return new CampaignController(
          appContainer.resolve(DI_TYPES.MergeMailingListsUseCase),
          appContainer.resolve(DI_TYPES.SendCampaignUseCase)
        ) as T;

      default:
        throw new Error(`Controller ${controller.name} not registered in IoC bridge.`);
    }
  }
};
