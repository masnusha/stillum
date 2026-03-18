import { getServerSession } from "next-auth";
import { redirect }         from "next/navigation";
import { authOptions }      from "@/auth";
import { prisma }           from "@/lib/prisma";
import ProfileClient        from "./_components/ProfileClient";

export const dynamic = "force-dynamic";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const uid = session.user.id;

  const user = await prisma.user.findUnique({
    where:  { id: uid },
    select: {
      id:              true,
      name:            true,
      email:           true,
      username:        true,
      bio:             true,
      avatarUrl:       true,
      bannerUrl:       true,
      image:           true,
      plan:            true,
      role:            true,
      statusEmoji:     true,
      telegramLink:    true,
      vkLink:          true,
      yandexMusicLink: true,
      customLink:      true,
      _count: {
        select: {
          followers: true,
          following: true,
          tracks:    true,
          playlists: true,
        },
      },
      tracks: {
        where:   { albumId: null },
        orderBy: { createdAt: "desc" },
        take:    50,
        select: {
          id:          true,
          title:       true,
          artist:      true,
          genre:       true,
          releaseDate: true,
          recordLabel: true,
          buyLink:     true,
          isExplicit:    true,
          isPublic:      true,
          allowComments: true,
          duration:    true,
          coverUrl:    true,
          audioUrl:    true,
        },
      },
      playlists: {
        orderBy: { createdAt: "desc" },
        take:    12,
        select: {
          id:       true,
          name:     true,
          coverUrl: true,
          isPublic: true,
          _count:   { select: { playlistTracks: true } },
        },
      },
      albums: {
        orderBy: { createdAt: "desc" },
        select: {
          id:          true,
          title:       true,
          coverImage:  true,
          type:        true,
          releaseDate: true,
          isPublic:    true,
          _count:      { select: { tracks: true } },
        },
      },
    },
  });

  if (!user) redirect("/login");

  return (
    <ProfileClient
      user={{
        id:              user.id,
        name:            user.name,
        email:           user.email,
        username:        user.username,
        bio:             user.bio,
        avatarUrl:       user.avatarUrl ?? user.image,
        bannerUrl:       user.bannerUrl,
        plan:            user.plan,
        role:            user.role,
        statusEmoji:     user.statusEmoji,
        followersCount:  user._count.followers,
        followingCount:  user._count.following,
        trackCount:      user._count.tracks,
        playlistCount:   user._count.playlists,
        tracks:      user.tracks,
        looseTracks: user.tracks.filter((t) => t.isPublic),
        playlists:       user.playlists.map((p) => ({
          id:         p.id,
          name:       p.name,
          coverUrl:   p.coverUrl,
          isPublic:   p.isPublic,
          trackCount: p._count.playlistTracks,
        })),
        albums:          user.albums.map((a) => ({
          id:          a.id,
          title:       a.title,
          coverImage:  a.coverImage,
          type:        a.type,
          releaseDate: a.releaseDate,
          isPublic:    a.isPublic,
          trackCount:  a._count.tracks,
        })),
        telegramLink:    user.telegramLink,
        vkLink:          user.vkLink,
        yandexMusicLink: user.yandexMusicLink,
        customLink:      user.customLink,
      }}
    />
  );
}
