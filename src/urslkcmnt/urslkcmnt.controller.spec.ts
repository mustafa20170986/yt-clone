import { Test, TestingModule } from '@nestjs/testing';
import { UrslkcmntController } from './urslkcmnt.controller';

describe('UrslkcmntController', () => {
  let controller: UrslkcmntController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UrslkcmntController],
    }).compile();

    controller = module.get<UrslkcmntController>(UrslkcmntController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
