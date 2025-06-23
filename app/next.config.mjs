/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config) => {
    config.module.rules.push({
      test: /\.handlebars$/,
      loader: "handlebars-loader",
    })

    const newConfig = {
      ...config,
      resolve: {
        ...config.resolve,
        fallback: {
          ...config.resolve.fallback,
          fs: false,
        },
      },
    }

    return newConfig
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/Ptask/home",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
