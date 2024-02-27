import { CategoryModel } from "@/schemas/category.js";
import Command from "@/structures/Command.js";
import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

export default new Command({
  data: new SlashCommandBuilder()
    .setName("create")
    .setDescription("Create a server stats category")
    .addStringOption((string) =>
      string.setName("category").setDescription("The name of the category")
    )
    .addStringOption((string) =>
      string
        .setName("members")
        .setDescription(
          "The name of the members channel, use {m} to show member count"
        )
    )
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async run(_client, interaction) {
    if (!interaction.inCachedGuild()) return;
    await interaction.deferReply({
      ephemeral: true,
    });
    if (!interaction.appPermissions.has(PermissionFlagsBits.ManageChannels)) {
      return await interaction.editReply(
        "I do not have the `Manage Channels` permission"
      );
    }
    let category = await CategoryModel.findOne({
      guildId: interaction.guildId,
    });
    if (!category) {
      category = new CategoryModel({
        guildId: interaction.guildId,
      });
    }
    if (
      interaction.guild.channels.cache.has(category.categoryId) &&
      category.membersChannelId &&
      interaction.guild.channels.cache.has(category.membersChannelId)
    ) {
      return await interaction.editReply(
        "You already have a server stats channel!"
      );
    }
    const categoryChannel = await interaction.guild?.channels.create({
      type: ChannelType.GuildCategory,
      name: interaction.options.getString("category") || "Server Stats",
      permissionOverwrites: [
        {
          id: interaction.guildId,
          type: OverwriteType.Role,
          deny: ["Connect"],
        },
      ],
      position: -1,
      reason: `${interaction.user.tag} created a ServerStats category`,
    });
    category.categoryId = categoryChannel.id;
    if (
      !category.membersChannelId ||
      !interaction.guild.channels.cache.has(category.membersChannelId)
    ) {
      const name = interaction.options.getString("members") || "Members: {m}";
      const channel = await categoryChannel.children.create({
        type: ChannelType.GuildVoice,
        name: name.replaceAll(
          "{m}",
          interaction.guild.memberCount.toLocaleString("en-US")
        ),
        reason: `${interaction.user.tag} created a ServerStats category`,
      });
      category.membersChannelId = channel.id;
      category.membersNameTemplate = name;
    }
    await interaction.editReply("Done making channels!");
  },
});
