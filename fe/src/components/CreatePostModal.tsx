// Make sure to only export components or re-export correctly if it's strictly a component module.
// But we have `export * from './create-post/types'` which breaks react-refresh.
// We should remove `export * from './create-post/types'` from here.
export { default } from './create-post/CreatePostModal'