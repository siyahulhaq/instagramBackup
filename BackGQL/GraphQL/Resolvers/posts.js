const {
  AuthenticationError,
  UserInputError,
  withFilter,
} = require("apollo-server-express");
const Post = require("../../Models/postModel");
const User = require("../../Models/userModel");
const checkAuth = require("../../utils/auth-verify");
const path = require("path");
const fs = require("fs");
const serverAddress = require("../../serverAddress");

module.exports = {
  Query: {
    async getPosts() {
      try {
        const posts = await Post.find().sort({ createdAt: -1 });
        const returnPosts = posts.map(async (post) => {
          const user = await User.findById(post.user);
          const {
            id,
            caption,
            createdAt,
            comments,
            image,
            likes,
            likesCount,
            commentsCount,
          } = post;

          return {
            id,
            caption,
            createdAt,
            comments,
            image,
            likes,
            likesCount,
            commentsCount,
            user,
          };
        });
        return returnPosts;
      } catch (err) {
        throw new Error(err);
      }
    },
    async getPost(_, { postId }) {
      try {
        const post = await Post.findById(postId);
        if (post) {
          const user = await User.findById(post.user);
          const {
            id,
            caption,
            createdAt,
            comments,
            likes,
            image,
            likesCount,
            commentsCount,
          } = post;

          return {
            id,
            caption,
            createdAt,
            image,
            comments,
            likes,
            likesCount,
            commentsCount,
            user,
          };
        } else {
          throw new Error("post not found");
        }
      } catch (err) {
        throw new Error(err);
      }
    },
    async getNews(_, { first, offset = 0 }, context) {
      const { id } = checkAuth(context);
      const user = await User.findById(id);
      const posts = await Post.find().sort({ createdAt: -1 });
      const postOfFollowings = posts.filter((post) => {
        const findFollowing = user.followings.find(
          (follwing) => String(follwing) === String(post.user)
        );
        return String(post.user) === String(findFollowing);
      });

      if (postOfFollowings.length > 0) {
        const returnPosts = postOfFollowings.map(async (post) => {
          const user = await User.findById(post.user);
          const {
            id,
            caption,
            createdAt,
            comments,
            likes,
            image,
            likesCount,
            commentsCount,
          } = post;

          return {
            id,
            caption,
            createdAt,
            comments,
            likes,
            image,
            likesCount,
            commentsCount,
            user,
          };
        });
        const totalCount = returnPosts.length;

        const news =
          first === undefined
            ? returnPosts.slice(offset)
            : returnPosts.slice(offset, offset + first);

        return { news, totalCount };
      } else {
        throw new Error("No Posts found");
      }
    },
    async getMyPosts(_, __, context) {
      const user = checkAuth(context);

      const { id } = user;
      try {
        const posts = await Post.find({ user: id }).sort({ createdAt: -1 });
        if (posts) {
          const returnPosts = posts.map(async (post) => {
            const user = await User.findById(post.user);
            const {
              id,
              caption,
              createdAt,
              comments,
              likes,
              image,
              likesCount,
              commentsCount,
            } = post;

            return {
              id,
              caption,
              createdAt,
              comments,
              likes,
              image,
              likesCount,
              commentsCount,
              user,
            };
          });
          return returnPosts;
        } else throw new Error("You dont have any posts");
      } catch (err) {
        throw new Error(err);
      }
    },
  },

  Mutation: {
    async deletePost(_, { postId }, context) {
      const user = checkAuth(context);
      try {
        const post = await Post.findById(postId);
        if (post) {
          if (user.userName === post.userName) {
            await post.delete();
            return "post deleted";
          } else {
            throw new AuthenticationError("action not allowed");
          }
        } else {
          throw new Error("Post not found");
        }
      } catch (err) {
        throw new Error(err);
      }
    },
    async uploadImage(_, { file }, context) {
      const { id, userName } = checkAuth(context);
      const user = await User.findById(id);
      if (user) {
        const { createReadStream, filename } = await file;
        const stream = createReadStream();
        const pathName = path.join(__dirname, `/public/images/${filename}`);
        await stream.pipe(fs.createWriteStream(pathName));
        return { url: `http://${serverAddress}:5000/images/${pathname}` };
      }
    },
    async createPost(_, { caption, image }, context) {
      const { id, userName } = checkAuth(context);
      const user = await User.findById(id);

      console.log(caption, image);

      if (caption.trim() === "") {
        throw new UserInputError("caption needed");
      }

      if (user) {
        const newPost = new Post({
          caption,
          createdAt: new Date().toISOString(),
          user: id,
          userName,
          image,
        });
        try {
          const post = await newPost.save();
          const user = await User.findById(post.user);
          const {
            id,
            caption,
            createdAt,
            comments,
            image,
            likes,
            likesCount,
            commentsCount,
          } = post;
          const returnPost = {
            id,
            caption,
            createdAt,
            comments,
            likes,
            image,
            likesCount,
            commentsCount,
            user,
          };
          context.pubSub.publish("NEW_POST", {
            newPost: returnPost,
          });

          const listeners = user.followers;

          context.pubSub.publish("NEW_POST_TO_FOLLOWERS", {
            newPostFromFollowings: returnPost,
            listeners,
          });

          return returnPost;
        } catch (err) {
          throw new Error(err);
        }
      }
    },
  },
  Subscription: {
    newPost: {
      subscribe: (_, __, { pubSub }) => pubSub.asyncIterator("NEW_POST"),
    },
    newPostFromFollowings: {
      subscribe: withFilter(
        (_, __, { pubSub }) => pubSub.asyncIterator("NEW_POST_TO_FOLLOWERS"),
        (payload, variables, { connection }) => {
          const { currentUser } = connection.context;
          const listner = payload.listeners.find(
            (reciever) => String(reciever) === String(currentUser.id)
          );
          return String(currentUser.id) === String(listner);
        }
      ),
    },
  },
};
