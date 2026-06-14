import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { userModel } from 'src/schema/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(userModel.name) private readonly userMdoel: Model<userModel>,
  ) {}
  //create user function
  async createuser(name: string, email: string) {
    //check if the email is already there
    const findinfo = await this.userMdoel.findOne({}).select('email name');
    if (findinfo?.email) {
      return { message: 'email already exist ' };
    }
    //else just pass the case
    return this.userMdoel.create({
      name,
      email,
    });
  }
}
