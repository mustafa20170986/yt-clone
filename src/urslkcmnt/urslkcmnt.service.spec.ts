import { Test, TestingModule } from '@nestjs/testing';
import { UrslkcmntService } from './urslkcmnt.service';

describe('UrslkcmntService', () => {
  let service: UrslkcmntService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UrslkcmntService],
    }).compile();

    service = module.get<UrslkcmntService>(UrslkcmntService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
