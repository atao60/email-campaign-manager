import { describe, it, expect, beforeEach } from 'vitest';

import { HealthController } from './HealthController';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    // Instantiate the controller before each test
    controller = new HealthController();
  });

  describe('getHealth', () => {
    it('should return a 200 OK status object', async () => {
      // Act
      const response = await controller.getHealth();

      // Assert
      expect(response).toEqual({ status: 'OK' });
    });
  });
});
