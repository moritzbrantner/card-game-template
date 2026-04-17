export const blogPage = {
  editor: {
    title: 'Write blog posts',
    description: 'Publish updates for your public profile blog.',
    cardTitle: 'Your blog',
    cardDescription: 'Open the blog editor or review the public page visitors can read.',
    openComposer: 'Write a post',
    backToProfile: 'Back to profile',
    viewPublicBlog: 'View public blog',
  },
  composer: {
    title: 'Local drafts',
    description: 'Write Markdown locally, keep drafts offline, and publish when you are ready.',
    drafts: {
      title: 'Drafts',
      empty: 'No local drafts yet. Start typing or create one manually.',
      untitled: 'Untitled draft',
    },
    editor: {
      empty: 'Start typing to create a local draft.',
      publishedReadonly: 'Published drafts are read-only locally. Create a new draft for your next post.',
    },
    actions: {
      newDraft: 'New draft',
      deleteDraft: 'Delete draft',
    },
    status: {
      savedLocally: 'Saved locally',
      queuedToPublish: 'Queued to publish',
      publishFailed: 'Publish failed',
      published: 'Published',
    },
    form: {
      title: 'Title',
      titlePlaceholder: 'What is this post about?',
      content: 'Post content',
      contentPlaceholder: 'Write your post here...',
      publish: 'Publish post',
      publishing: 'Publishing…',
      error: 'Unable to publish your blog post right now. Please try again.',
    },
  },
  posts: {
    title: 'Published posts',
    description: 'Everything you publish here appears on your public blog page.',
    publishedAt: 'Published {date}',
    updatedAt: 'Updated {date}',
    empty: 'No posts published yet.',
  },
  publicPage: {
    eyebrow: 'User blog',
    description: 'Read the latest posts from this profile.',
    backToProfile: 'Back to profile',
  },
  profileCard: {
    title: 'Blog',
    description: 'Read posts written by {name}.',
    caption: 'Open the blog page to read published posts in one place.',
    open: 'Open blog',
  },
};
