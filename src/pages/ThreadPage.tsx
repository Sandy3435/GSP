import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  addReply,
  deleteReply,
  getPost,
  getReplies,
} from '../lib/platformStore'
import type { Post, PostReply } from '../data/mockData'
import { Avatar, VoteWidget } from '../components/ui'

export default function ThreadPage() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [post, setPost] = useState<Post | null>(null)
  const [replies, setReplies] = useState<PostReply[]>([])
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  const reload = () => {
    if (!postId) return
    setPost(getPost(postId))
    setReplies(getReplies(postId))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  if (!post) {
    return (
      <div className="flex flex-col items-center gap-3 py-space-xl text-center">
        <span className="material-symbols-outlined text-[44px] text-outline">forum</span>
        <p className="text-headline-sm font-bold text-on-surface">Discussion not found</p>
        <Link
          to="/community"
          className="rounded-lg bg-primary-container px-4 py-2 font-label-md text-label-md font-bold text-on-primary"
        >
          Back to community
        </Link>
      </div>
    )
  }

  const submit = () => {
    if (!user) return
    if (body.trim().length < 2) {
      setError('Write a reply before posting.')
      return
    }
    addReply({
      postId: post.id,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      body: body.trim(),
    })
    setBody('')
    setError('')
    reload()
  }

  return (
    <div className="flex flex-col gap-space-md pb-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant"
        aria-label="Back"
      >
        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
      </button>

      <article className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-space-md shadow-sm">
        <div className="flex items-start gap-space-sm">
          <VoteWidget initial={post.votes} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 font-label-xs text-label-xs text-on-surface-variant">
              <Avatar name={post.author} tone={post.avatarTone} size="xs" />
              <span className="font-bold text-on-surface">{post.author}</span>
              {post.authorRole === 'mentor' || post.badge ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary-container px-1.5 py-0.5 font-bold text-on-secondary-container">
                  <span className="material-symbols-outlined text-[12px]">verified</span>
                  Mentor
                </span>
              ) : null}
              <span>• {post.time}</span>
            </div>
            <h1 className="mt-1 text-headline-sm font-bold leading-snug text-primary">
              {post.title}
            </h1>
            <div className="mt-1 flex flex-wrap gap-1">
              {(post.tags ?? [post.tag]).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-secondary-container/40 px-2 py-0.5 font-label-xs text-label-xs font-semibold text-on-secondary-container"
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-2 whitespace-pre-line font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
              {post.body ?? post.excerpt}
            </p>
          </div>
        </div>
      </article>

      <section className="flex flex-col gap-2">
        <h2 className="font-label-md text-label-md font-bold text-primary">
          {replies.length} {replies.length === 1 ? 'response' : 'responses'}
        </h2>
        {replies.length === 0 && (
          <div className="rounded-xl bg-surface-container-low p-space-md text-center">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              No responses yet. Be the first to help.
            </p>
          </div>
        )}
        {replies.map((reply) => (
          <div key={reply.id} className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
            <div className="flex flex-wrap items-center gap-1.5 font-label-xs text-label-xs text-on-surface-variant">
              <Avatar
                name={reply.authorName}
                tone={reply.authorRole === 'mentor' ? 'sage' : 'pine'}
                size="xs"
              />
              <span className="font-bold text-on-surface">
                {reply.authorRole === 'mentor' ? 'Mentor ' : ''}
                {reply.authorName}
              </span>
              {reply.authorRole === 'mentor' && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary-container px-1.5 py-0.5 font-bold text-on-secondary-container">
                  <span className="material-symbols-outlined text-[11px]">verified</span>
                  Mentor
                </span>
              )}
              {reply.authorRole === 'admin' && (
                <span className="rounded-full bg-surface-container-high px-1.5 py-0.5 font-bold text-primary">
                  Admin
                </span>
              )}
              <span>• {new Date(reply.createdAt).toLocaleString()}</span>
            </div>
            <p className="whitespace-pre-line font-body-sm text-body-sm leading-relaxed text-on-surface">
              {reply.body}
            </p>
            {user?.id === reply.authorId && (
              <button
                type="button"
                onClick={() => {
                  deleteReply(reply.id, post.id)
                  reload()
                }}
                className="flex w-max items-center gap-1 font-label-xs text-label-xs text-error"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                Delete
              </button>
            )}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest p-space-md shadow-sm">
        <h2 className="font-label-md text-label-md font-bold text-primary">Add a response</h2>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Share guidance, ask a follow-up, or describe what worked for you…"
          className="w-full resize-none rounded-xl bg-surface-container-low p-3.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
        />
        {error && <p className="font-label-xs text-label-xs text-error">{error}</p>}
        <button
          type="button"
          onClick={submit}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary-container font-label-md text-label-md font-bold text-on-primary"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
          Post response
        </button>
      </section>
    </div>
  )
}
