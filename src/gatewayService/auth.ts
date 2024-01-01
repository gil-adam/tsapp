import { Strategy, ExtractJwt, StrategyOptions } from "passport-jwt";
import passport from "passport";
import { initTableClient, TableNames } from "../utils";

export const applyPassportStrategy = (passport: passport.Authenticator) => {
  const options: StrategyOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: "foo",
  };
  passport.use(
    new Strategy(options, async (payload, done) => {
      try {
        if (await verifyUser(payload.user)) {
          console.log("User verified");
          return done(null, { user: payload.user });
        }
        console.log("User not verified");
        return done(null, false);
      } catch (err) {
        console.log("Auth error");
        return done(err, false);
      }
    })
  );
};

const verifyUser = async (user: string): Promise<boolean> => {
  try {
    const usersTableClient = initTableClient(TableNames.users);
    await usersTableClient.getEntity("1", user as string);
    return true;
  } catch {
    return false;
  }
};
