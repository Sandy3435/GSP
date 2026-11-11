import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { communityTags } from '../data/mockData'
import { deletePost, getPosts, savePost } from '../lib/platformStore'
import { useAuth } from '../context/AuthContext'
import type { Post } from '../data/mockData'
import { Avatar, VoteWidget } from '../components/ui'

type FeedMode = 'hot' | 'new' | 'top' | 'mine'

const feedModes: { id: FeedMode; label: string; icon?: string; emoji?: string }[] = [
  { id: 'hot', label: 'Hot', emoji: '🔥' },
  { id: 'new', label: 'New', emoji: '✨' },
  { id: 'top', label: 'Top', icon: 'trending_up' },
  { id: 'mine', label: 'My Questions', emoji: '📌' },
]

export default function CommunityPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [mode, setMode] = useState<FeedMode>('hot')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const reload = () => setPosts(getPosts())

  useEffect(() => {
    reload()
  }, [])

  const visible = useMemo(() => {
    let list = [...posts]
    if (mode === 'mine') {
      list = list.filter((p) => p.authorId === user?.id || p.mine)
    }
    if (activeTag) {
      list = list.filter((p) =>
        (p.tags ?? [p.tag]).some((tag) =>
          tag.toLowerCase().includes(activeTag.toLowerCase().replace(/^#/, '')),
        ),
      )
    }
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.body ?? p.excerpt).toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q) ||
          (p.tags ?? [p.tag]).some((t) => t.toLowerCase().includes(q)),
      )
    }
    if (mode === 'hot' || mode === 'top') list.sort((a, b) => b.votes - a.votes)
    if (mode === 'new') list.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    return list
  }, [posts, mode, activeTag, query, user])

  const publishPost = (title: string, body: string, tag: string) => {
    if (!user) return
    const post: Post = {
      id: `post_${Date.now()}`,
      author: user.name,
      authorInitials: user.name.slice(0, 1).toUpperCase(),
      avatarTone: user.role === 'mentor' ? 'sage' : 'pine',
      time: 'Just now',
      tag,
      tags: [tag],
      title,
      excerpt: body || 'No additional context provided yet.',
      body: body || 'No additional context provided yet.',
      votes: 1,
      replies: 0,
      authorId: user.id,
      authorRole: user.role,
      createdAt: new Date().toISOString(),
      mine: true,
    }
    savePost(post)
    reload()
    setModalOpen(false)
    setMode('mine')
  }

  return (
    <div className="flex flex-col gap-space-md pb-4">
      <div className="flex items-center justify-between gap-space-sm">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions, tags, colleges..."
            className="h-11 w-full rounded-xl bg-surface-container-lowest pl-10 pr-4 font-body-sm text-body-sm text-on-surface shadow-sm transition-all placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-secondary/40"
          />
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex h-11 items-center gap-1.5 rounded-xl bg-primary-container px-space-md font-label-md text-label-md text-on-primary shadow-sm transition-transform active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span>Ask</span>
        </button>
      </div>

      <div className="no-scrollbar flex items-center gap-space-xs overflow-x-auto py-1">
        {feedModes.map((fm) => (
          <button
            key={fm.id}
            type="button"
            onClick={() => setMode(fm.id)}
            className={`flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 font-label-sm text-label-sm transition-colors ${
              mode === fm.id
                ? 'bg-primary-container font-bold text-on-primary shadow-sm'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {fm.emoji && <span className="text-[14px]">{fm.emoji}</span>}
            {fm.icon && <span className="material-symbols-outlined text-[16px]">{fm.icon}</span>}
            {fm.label}
          </button>
        ))}
      </div>

      <div className="no-scrollbar flex items-center gap-space-xs overflow-x-auto py-0.5">
        <span className="pl-1 font-label-xs text-label-xs uppercase tracking-wider text-on-surface-variant/70">
          Tags:
        </span>
        {communityTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            className={`shrink-0 rounded-lg px-3 py-1 font-label-xs text-label-xs transition-colors ${
              activeTag === tag
                ? 'bg-secondary-container font-bold text-on-secondary-container'
                : 'bg-surface-container text-on-surface-variant hover:bg-secondary-container'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-space-md">
        {visible.length === 0 && (
          <div className="rounded-xl bg-surface-container-low p-space-md text-center">
            <p className="font-label-md text-label-md font-semibold text-on-surface">
              {mode === 'mine' ? 'You haven’t asked anything yet' : 'No threads match your filters'}
            </p>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
              {mode === 'mine'
                ? 'Tap “Ask” to post your first question to the Commons.'
                : 'Try clearing the search or picking another tag.'}
            </p>
          </div>
        )}

        {visible.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            canDelete={post.authorId === user?.id}
            onDelete={() => {
              deletePost(post.id)
              reload()
            }}
          />
        ))}
      </div>

      {modalOpen && (
        <AskModal
          onClose={() => setModalOpen(false)}
          onPublish={publishPost}
          initialTag={activeTag ?? communityTags[0]}
        />
      )}
    </div>
  )
}

function PostCard({
  post,
  canDelete,
  onDelete,
}: {
  post: Post
  canDelete: boolean
  onDelete: () => void
}) {
  const tags = post.tags ?? [post.tag]
  return (
    <article className="relative flex flex-col gap-space-sm overflow-hidden rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
      {post.pinned && (
        <div className="flex items-center gap-1.5 pb-1 font-label-xs text-label-xs text-secondary">
          <span className="material-symbols-outlined text-[16px] text-secondary">push_pin</span>
          <span className="font-semibold uppercase tracking-wider">Pinned by GSP Mentor</span>
        </div>
      )}

      <div className="flex items-start gap-space-sm">
        <VoteWidget initial={post.votes} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5 font-label-xs text-label-xs text-on-surface-variant">
            <Avatar name={post.author} tone={post.avatarTone} size="xs" />
            <span className="font-bold text-on-surface">{post.author}</span>
            {post.authorRole === 'mentor' || post.badge ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary-container px-1.5 py-0.5 font-bold text-on-secondary-container">
                <span className="material-symbols-outlined text-[11px]">verified</span>
                Mentor
              </span>
            ) : null}
            {post.authorRole === 'admin' && (
              <span className="rounded-full bg-surface-container-high px-1.5 py-0.5 font-bold text-primary">Admin</span>
            )}
            <span>• {post.time}</span>
          </div>

          <Link to={`/community/${post.id}`} className="group">
            <h2 className="text-headline-sm font-bold leading-snug tracking-tight text-on-surface transition-colors group-hover:text-primary">
              {post.title}
            </h2>
            <p className="mt-1 line-clamp-2 font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
              {post.excerpt}
            </p>
          </Link>

          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary-container/40 px-2 py-0.5 font-label-xs text-label-xs font-semibold text-on-secondary-container"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Link
              to={`/community/${post.id}`}
              className="flex items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1 font-label-xs text-label-xs text-on-surface-variant transition-colors hover:text-primary"
            >
              <span className="material-symbols-outlined text-[16px]">chat_bubble_outline</span>
              <span className="font-semibold">{post.replies} replies</span>
            </Link>
            {canDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-1 font-label-xs text-label-xs text-error"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                Delete
              </button>
            ) : (
              <span className="font-label-xs text-label-xs text-on-surface-variant/70">
                Active discussion
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

function AskModal({
  onClose,
  onPublish,
  initialTag,
}: {
  onClose: () => void
  onPublish: (title: string, body: string, tag: string) => void
  initialTag: string
}) {
  const [tag, setTag] = useState(initialTag)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [publishing, setPublishing] = useState(false)

  const submit = () => {
    if (!title.trim() || !body.trim() || publishing) return
    setPublishing(true)
    window.setTimeout(() => onPublish(title.trim(), body.trim(), tag), 350)
  }

  return (
    <div className="fixed inset-0 z-[60] mx-auto flex max-w-[430px] items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full flex-col gap-space-sm overflow-y-auto rounded-2xl bg-surface-container-lowest p-space-md shadow-2xl">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[24px] text-primary">forum</span>
            <h3 className="text-headline-sm font-bold text-on-surface">Ask the Commons</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">Topic tag</label>
          <div className="no-scrollbar flex flex-wrap gap-1.5 py-1">
            {communityTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                className={`shrink-0 rounded-full px-3 py-1 font-label-xs text-label-xs transition-colors ${
                  tag === t
                    ? 'bg-primary-container font-bold text-on-primary'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="postTitle" className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">Question title</label>
          <input
            id="postTitle"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. What does Brown actually look for in the Open Curriculum prompt?"
            className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="postBody" className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">Details &amp; context</label>
          <textarea
            id="postBody"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your background, what you have tried so far, or specific schools..."
            rows={4}
            className="w-full resize-none rounded-xl bg-surface-container-low p-3.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-1 font-label-xs text-label-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
            <span>Peer &amp; mentor reviewed</span>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim() || !body.trim() || publishing}
            className={`rounded-xl px-5 py-2.5 font-label-md text-label-md font-bold shadow-sm transition-all active:scale-95 ${
              title.trim() && body.trim() && !publishing
                ? 'bg-primary-container text-on-primary'
                : 'cursor-not-allowed bg-surface-container text-on-surface-variant'
            }`}
          >
            {publishing ? 'Posting...' : 'Publish question'}
          </button>
        </div>
      </div>
    </div>
  )
}
