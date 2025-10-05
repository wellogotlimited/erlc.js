import { z } from "zod";

export const PermissionEnum = z.enum([
  "Normal",
  "Server Moderator",
  "Server Administrator",
  "Server Owner",
]);

export const PlayerSchema = z
  .object({
    Player: z.string(),
    Permission: PermissionEnum,
    Callsign: z.string().optional().nullable(),
    Team: z.string().optional(),
  })
  .transform(({ Player, ...rest }) => ({
    Username: Player.split(":")[0],
    UserId: Player.split(":")[1],
    ...rest,
  }));

export const PlayersResponse = z.array(PlayerSchema);

export const JoinLogEntry = z
  .object({
    Join: z.boolean(),
    Timestamp: z.number(),
    Player: z.string(),
  })
  .transform(({ Player, ...rest }) => ({
    Username: Player.split(":")[0],
    UserId: Player.split(":")[1],
    ...rest,
  }));

export const KillLogEntry = z
  .object({
    Killed: z.string(),
    Timestamp: z.number(),
    Killer: z.string(),
  })
  .transform(({ Killer, Killed, ...rest }) => ({
    Killer: {
      Username: Killer.split(":")[0],
      UserId: Killer.split(":")[1],
    },
    Killed: {
      Username: Killed.split(":")[0],
      UserId: Killed.split(":")[1],
    },
    ...rest,
  }));

export const ServerStatus = z.object({
  Name: z.string().optional(),
  OwnerId: z.number().optional(),
  CoOwners: z.array(z.number()).optional(),
  CurrentPlayers: z.number().optional(),
  MaxPlayers: z.number().optional(),
  JoinKey: z.string().optional(),
  AccVerifiedReq: z.string().optional(),
  TeamBalance: z.boolean().optional(),
});

export const CommandLogEntry = z.object({
  Player: z.string(),
  Timestamp: z.number(),
  Command: z.string(),
});

export const ModCallEntry = z
  .object({
    Caller: z.string(),
    Moderator: z.string().optional().nullable(),
    Timestamp: z.number(),
  })
  .transform(({ Moderator, Caller, ...rest }) => ({
    ...rest,
    Moderator: Moderator
      ? {
          Username: Moderator.split(":")[0],
          UserId: Moderator.split(":")[1],
        }
      : null,
    Caller: {
      Username: Caller.split(":")[0],
      UserId: Caller.split(":")[1],
    },
  }));

export const BanEntry = z.record(z.string().regex(/^\d+$/), z.string());

export const VehicleEntry = z.object({
  Name: z.string().optional(),
  Owner: z.string().optional(),
});

export const StaffResponse = z.object({
  CoOwners: z.array(z.number()).optional(),
  Admins: z.record(z.string(), z.string()).optional(),
  Mods: z.record(z.string(), z.string()).optional(),
});

export type TServerStatus = z.infer<typeof ServerStatus>;
export type TPlayersResponse = z.infer<typeof PlayersResponse>;
export type TJoinLogEntry = z.infer<typeof JoinLogEntry>;
export type TKillLogEntry = z.infer<typeof KillLogEntry>;
export type TCommandLogEntry = z.infer<typeof CommandLogEntry>;
export type TModCallEntry = z.infer<typeof ModCallEntry>;
export type TBanEntry = z.infer<typeof BanEntry>;
export type TVehicleEntry = z.infer<typeof VehicleEntry>;
export type TStaffResponse = z.infer<typeof StaffResponse>;
