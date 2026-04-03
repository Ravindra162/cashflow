import { motion } from 'framer-motion';

export function TactileButton({ children, className, onClick, ...props }) {
    return (
        <motion.button
            className={className}
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            {...props}
        >
            {children}
        </motion.button>
    );
}

const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { type: 'spring', stiffness: 350, damping: 25 }
    }
};

export function AnimatedCard({ children, className, delay = 0, ...props }) {
    return (
        <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className={className}
            transition={{ delay }}
            {...props}
        >
            {children}
        </motion.div>
    );
}

const listVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
        opacity: 1, x: 0,
        transition: { type: 'spring', stiffness: 350, damping: 25 }
    }
};

export function AnimatedList({ children, className }) {
    return (
        <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function AnimatedListItem({ children, className, ...props }) {
    return (
        <motion.div
            variants={itemVariants}
            className={className}
            whileHover={{ scale: 1.02, x: 5, transition: { type: 'spring', stiffness: 400 } }}
            {...props}
        >
            {children}
        </motion.div>
    );
}

const pageVariants = {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }
};

export function PageTransition({ children, className = '' }) {
    return (
        <motion.div
            className={`page-transition-wrapper ${className}`}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ width: '100%', height: '100%' }}
        >
            {children}
        </motion.div>
    );
}
