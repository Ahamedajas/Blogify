import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { verify } from 'hono/jwt';
import { createBlogInput, updateBlogInput } from '@ahamed_ajas/common'

const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  },
  Variables: {
    userId: string;
  }
}>();

blogRouter.use("/*", async (c, next) => {
  const authHeader = c.req.header("authorization") || "";
  console.log("Authorization Header:", authHeader); // Log the Authorization header
  
  // Remove 'Bearer ' prefix
  const token = authHeader.replace("Bearer ", "");
  console.log("Token:", token); // Log the token
  
  try {
      const user = await verify(token, c.env.JWT_SECRET) as { id: string };
      console.log("Verified User:", user); // Log the verified user
      if (user) {
          c.set("userId", user.id);
          await next();
      } else {
          c.status(403);
          return c.json({
              message: "You are not logged in"
          });
      }
  } catch(e) {
      console.log("Verification Error:", e); // Log any errors
      c.status(403);
      return c.json({
          message: "You are not logged in"
      });
  }
});



blogRouter.post('/', async (c) => {
  const body = await c.req.json();
  // const { success } = createBlogInput.safeParse(body);
  // if(!success){
  //   c.status(411);
  //   return c.json({
  //     message : "Inputs are not correct"
  //   })
  // }
  console.log(body)

  const authorId = c.get("userId");
  console.log(authorId)
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blog = await prisma.blog.create({
    data: {
      Title: body.title,
      content: body.content,
      authorId: parseInt(authorId) // Use the userId from context
    }
  });

  return c.json({
    id: blog.id
  });
});

blogRouter.put('/', async (c) => {
  const body = await c.req.json();
  const { success } = updateBlogInput.safeParse(body);
  if(!success){
    c.status(411);
    return c.json({
      message : "Inputs are not correct"
    })
  }
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blog = await prisma.blog.update({
    where: {
      id: body.id
    },
    data: {
      Title: body.title,
      content: body.content,
      authorId: parseInt(c.get('userId')) // Use the userId from context
    }
  });

  return c.json({
    id: blog.id
  });
});

// TODO: Add pagination
blogRouter.get('/bulk', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const blogs = await prisma.blog.findMany({
    select:{
      content :  true,
      Title : true,
      id : true,
      author : {
        select: {
          name : true
        }
      }
    }
  });

  return c.json({
    blogs
  });
});

blogRouter.get('/:id', async (c) => {
  const id = c.req.param("id");
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blog = await prisma.blog.findFirst({
    where: {
      id: Number(id)
    },
    select: {
      Title: true,
      content: true,
      author: {
        select: { name: true
        }
      }
    }
  });
  try {
    return c.json({
      blog
    });
  } catch (e) {
    c.status(411);
    return c.json({
      message: "Error while fetching blog post"
    });
  }
});

export default blogRouter;