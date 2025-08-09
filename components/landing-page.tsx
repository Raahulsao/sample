"use client"

import { useState } from "react"
import { ArrowRight, Zap, Shield, Star, Check, ChevronDown, Brain, Sparkles, Users, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import ThemeChanger from "@/components/theme-changer"
import AuthModal from "@/components/auth-modal"

interface LandingPageProps {
  onLogin: (userData: { name: string; email: string }) => void
}

const features = [
  {
    icon: Brain,
    title: "Advanced AI Models",
    description: "Access to the latest GPT models with superior reasoning and creativity capabilities.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Get instant responses with our optimized infrastructure and real-time processing.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your conversations are encrypted and never used to train our models.",
  },
  {
    icon: Sparkles,
    title: "Multi-Modal",
    description: "Generate text, images, and analyze documents all in one unified interface.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Share conversations and collaborate with your team seamlessly.",
  },
  {
    icon: Globe,
    title: "Global Access",
    description: "Available worldwide with multi-language support and local data centers.",
  },
]

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Product Manager",
    company: "TechCorp",
    content:
      "ChatAI has revolutionized how our team brainstorms and creates content. The AI responses are incredibly accurate and helpful.",
    rating: 5,
  },
  {
    name: "Michael Rodriguez",
    role: "Content Creator",
    company: "Creative Studio",
    content:
      "I use ChatAI daily for writing, ideation, and research. It's like having a brilliant assistant available 24/7.",
    rating: 5,
  },
  {
    name: "Emily Johnson",
    role: "Developer",
    company: "StartupXYZ",
    content:
      "The code generation and debugging assistance is phenomenal. It's saved me countless hours of development time.",
    rating: 5,
  },
]

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    features: ["20 messages per day", "Basic AI model access", "Text generation", "Community support"],
    popular: false,
  },
  {
    name: "Pro",
    price: "$20",
    period: "per month",
    description: "For power users and professionals",
    features: [
      "Unlimited messages",
      "Advanced AI models",
      "Image generation",
      "Priority support",
      "Chat history export",
      "Custom instructions",
    ],
    popular: true,
  },
  {
    name: "Team",
    price: "$50",
    period: "per month",
    description: "For teams and organizations",
    features: [
      "Everything in Pro",
      "Team collaboration",
      "Admin dashboard",
      "Usage analytics",
      "Custom integrations",
      "Dedicated support",
    ],
    popular: false,
  },
]

const faqs = [
  {
    question: "What makes ChatAI different from other AI assistants?",
    answer:
      "ChatAI combines the latest AI models with a focus on privacy, speed, and user experience. We offer multi-modal capabilities, team collaboration features, and maintain the highest standards for data protection.",
  },
  {
    question: "Is my data safe and private?",
    answer:
      "Absolutely. All conversations are encrypted end-to-end, and we never use your data to train our models. You have full control over your data and can delete it at any time.",
  },
  {
    question: "Can I use ChatAI for commercial purposes?",
    answer:
      "Yes, all our paid plans include commercial usage rights. You can use ChatAI-generated content for your business, marketing, and commercial projects.",
  },
  {
    question: "What AI models do you support?",
    answer:
      "We support the latest GPT models, including GPT-4, Claude, and other cutting-edge language models. Pro users get access to the most advanced models as they become available.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "Yes, we offer a 30-day money-back guarantee for all paid plans. If you're not satisfied, contact our support team for a full refund.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period.",
  },
]

export default function LandingPage({ onLogin }: LandingPageProps) {
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: "signin" | "signup" }>({
    isOpen: false,
    mode: "signin",
  })
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-foreground to-muted-foreground flex items-center justify-center">
              <span className="text-background font-bold text-sm">AI</span>
            </div>
            <span className="font-semibold text-lg text-foreground">ChatAI</span>
          </div>

          <div className="flex items-center gap-4">
            <ThemeChanger />
            <div className="hidden sm:flex items-center gap-2">
              <Button onClick={() => setAuthModal({ isOpen: true, mode: "signin" })} variant="ghost" size="sm">
                Sign In
              </Button>
              <Button onClick={() => setAuthModal({ isOpen: true, mode: "signup" })} size="sm">
                Get Started
              </Button>
            </div>
            <div className="sm:hidden">
              <Button onClick={() => setAuthModal({ isOpen: true, mode: "signup" })} size="sm">
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              The Future of AI
              <span className="block text-muted-foreground">Conversation</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Experience the most advanced AI assistant. Generate text, create images, and solve complex problems with
              unprecedented accuracy.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => setAuthModal({ isOpen: true, mode: "signup" })}
                size="lg"
                className="text-lg px-8 py-6"
              >
                Start Chatting Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                onClick={() => setAuthModal({ isOpen: true, mode: "signin" })}
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Powerful Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to unlock the full potential of AI assistance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow h-full flex flex-col"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 flex-shrink-0">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 flex flex-col">
                  <h3 className="text-xl font-semibold text-foreground mb-3 leading-tight">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed flex-1">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">What Our Users Say</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of satisfied users who trust ChatAI for their daily tasks
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-foreground mb-4">"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role} at {testimonial.company}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that's right for you. Upgrade or downgrade at any time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`bg-card border rounded-lg p-8 relative ${
                  plan.popular ? "border-primary shadow-lg scale-105" : "border-border"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                  <p className="text-muted-foreground">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => setAuthModal({ isOpen: true, mode: "signup" })}
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.name === "Free" ? "Get Started" : "Choose Plan"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Everything you need to know about ChatAI</p>
          </div>

          <div className="max-w-3xl mx-auto">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-border">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full py-6 text-left flex items-center justify-between hover:text-primary transition-colors"
                >
                  <span className="text-lg font-medium text-foreground pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform ${
                      expandedFaq === index ? "transform rotate-180" : ""
                    }`}
                  />
                </button>
                {expandedFaq === index && (
                  <div className="pb-6">
                    <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Ready to Get Started?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of users who are already experiencing the future of AI conversation.
            </p>
            <Button
              onClick={() => setAuthModal({ isOpen: true, mode: "signup" })}
              size="lg"
              className="text-lg px-8 py-6"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-foreground to-muted-foreground flex items-center justify-center">
                  <span className="text-background font-bold text-sm">AI</span>
                </div>
                <span className="font-semibold text-lg text-foreground">ChatAI</span>
              </div>
              <p className="text-muted-foreground">
                The most advanced AI assistant for all your creative and professional needs.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    API
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Integrations
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Status
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center">
            <p className="text-muted-foreground">© 2024 ChatAI. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ isOpen: false, mode: "signin" })}
        initialMode={authModal.mode}
        onLogin={onLogin}
      />
    </div>
  )
}
