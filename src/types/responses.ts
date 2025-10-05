import { z } from "zod";

export const PermissionEnum = z.enum([
  "Normal",
  "Server Moderator",
  "Server Administrator",
  "Server Owner",
]);

export const PlayerSchema = z.object({
  Player: z.string(),
  Permission: PermissionEnum,
  Callsign: z.string().optional().nullable(),
  Team: z.string().optional(),
});

export const PlayersResponse = z.array(PlayerSchema);

export const JoinLogEntry = z.object({
  Join: z.boolean(),
  Timestamp: z.number(),
  Player: z.string(),
});

export const KillLogEntry = z.object({
  Killed: z.string(),
  Timestamp: z.number(),
  Killer: z.string(),
});

export const ServerStatus = z.object({
  Name: z.string().optional(),
  Owner: z.string().optional(),
  CoOwners: z.array(z.string()).optional(),
  Players: z.number().optional(),
  MaxPlayers: z.number().optional(),
  JoinKey: z.string().optional(),
});

export const CommandLogEntry = z.object({
  Player: z.string(),
  Timestamp: z.number(),
  Command: z.string(),
});

export const ModCallEntry = z.object({
  Caller: z.string(),
  Moderator: z.string().optional().nullable(),
  Timestamp: z.number(),
});

export const BanEntry = z.object({
  PlayerId: z.union([z.number(), z.string()]),
});

export const VehicleEntry = z.object({
  Name: z.string().optional(),
  Owner: z.string().optional(),
});

export const StaffResponse = z.object({
  CoOwners: z.array(z.string()).optional(),
  Admins: z.array(z.string()).optional(),
  Mods: z.array(z.string()).optional(),
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
